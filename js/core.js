(function () {
    "use strict";

    const CSRF_STORAGE_KEY = "primewayCsrfToken";
    const STATE_API_URL = "../api/estado/index.php";
    const DATA_MODEL_VERSION_KEY = "primewayDataModelVersion";
    const DATA_MODEL_VERSION = "database-first-v1";
    const MANAGED_STORAGE_KEYS = new Set([
        "primewayGuardians",
        "primewaySubjects",
        "primewayClasses",
        "primewayCalendarEvents",
        "primewayNotifications",
        "primewayChatProfessor"
    ]);

    const originalFetch = window.fetch.bind(window);
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const pendingSaves = new Map();
    let hydrating = false;

    function limparDadosDeDemonstracaoLegados() {
        if (
            window.localStorage.getItem(DATA_MODEL_VERSION_KEY) ===
            DATA_MODEL_VERSION
        ) {
            return;
        }

        const legacyKeys = [
            "primewayStudents",
            "primewayGuardians",
            "primewaySubjects",
            "primewayClasses",
            "primewayCalendarEvents",
            "primewayNotifications",
            "primewayChatProfessor"
        ];

        for (const key of legacyKeys) {
            originalRemoveItem.call(window.localStorage, key);
        }

        originalSetItem.call(
            window.localStorage,
            DATA_MODEL_VERSION_KEY,
            DATA_MODEL_VERSION
        );
    }

    limparDadosDeDemonstracaoLegados();

    function isApiRequest(input) {
        try {
            const rawUrl =
                input instanceof Request
                    ? input.url
                    : String(input);
            const url = new URL(rawUrl, window.location.href);

            return (
                url.origin === window.location.origin &&
                url.pathname.includes("/api/")
            );
        } catch (error) {
            return false;
        }
    }

    function storeCsrfToken(payload) {
        const token = payload?.csrfToken;

        if (
            typeof token === "string" &&
            token.length === 64
        ) {
            sessionStorage.setItem(
                CSRF_STORAGE_KEY,
                token
            );
        }
    }

    window.fetch = async function primewayFetch(input, init = {}) {
        const apiRequest = isApiRequest(input);
        const requestMethod = String(
            init.method ||
            (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        const options = { ...init };

        if (
            apiRequest &&
            !["GET", "HEAD", "OPTIONS"].includes(requestMethod)
        ) {
            const headers = new Headers(
                init.headers ||
                (input instanceof Request ? input.headers : undefined)
            );
            const token = sessionStorage.getItem(CSRF_STORAGE_KEY);

            if (token) {
                headers.set("X-CSRF-Token", token);
            }

            options.headers = headers;
        }

        const response = await originalFetch(input, options);

        if (apiRequest) {
            try {
                storeCsrfToken(
                    await response.clone().json()
                );
            } catch (error) {
                // Respostas sem JSON não participam do protocolo de sessão.
            }
        }

        return response;
    };

    async function saveState(key, serializedValue) {
        let value;

        try {
            value = JSON.parse(serializedValue);
        } catch (error) {
            value = serializedValue;
        }

        const response = await window.fetch(
            STATE_API_URL,
            {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ key, value })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Falha ao persistir ${key}: HTTP ${response.status}`
            );
        }
    }

    function scheduleSave(key, value) {
        const previous = pendingSaves.get(key);

        if (previous) {
            window.clearTimeout(previous);
        }

        const timeout = window.setTimeout(
            async function () {
                pendingSaves.delete(key);

                try {
                    await saveState(key, value);
                } catch (error) {
                    console.error(
                        "PrimeWay: não foi possível sincronizar o estado com o servidor.",
                        error
                    );
                }
            },
            200
        );

        pendingSaves.set(key, timeout);
    }

    Storage.prototype.setItem = function primewaySetItem(key, value) {
        originalSetItem.call(this, key, value);

        if (
            this === window.localStorage &&
            !hydrating &&
            MANAGED_STORAGE_KEYS.has(String(key))
        ) {
            scheduleSave(
                String(key),
                String(value)
            );
        }
    };

    async function hydrateState() {
        if (
            !window.location.pathname.includes("/pages/") ||
            window.location.pathname.endsWith("/login.html")
        ) {
            return;
        }

        try {
            const response = await window.fetch(
                STATE_API_URL,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            if (
                !data?.success ||
                !data.state ||
                typeof data.state !== "object"
            ) {
                return;
            }

            hydrating = true;

            const serverKeys =
                new Set(
                    Object.keys(data.state)
                );

            const writableKeys =
                new Set(
                    Array.isArray(data.writableKeys)
                        ? data.writableKeys
                        : []
                );

            for (const [key, value] of Object.entries(data.state)) {
                if (MANAGED_STORAGE_KEYS.has(key)) {
                    originalSetItem.call(
                        window.localStorage,
                        key,
                        JSON.stringify(value)
                    );
                }
            }

            hydrating = false;

            for (const key of writableKeys) {
                if (
                    !serverKeys.has(key) &&
                    MANAGED_STORAGE_KEYS.has(key)
                ) {
                    const localValue =
                        window.localStorage.getItem(key);

                    if (localValue !== null) {
                        scheduleSave(key, localValue);
                    }
                }
            }
        } catch (error) {
            console.warn(
                "PrimeWay: o modo offline local foi mantido.",
                error
            );
        } finally {
            hydrating = false;
        }
    }

    window.PrimeWay = Object.freeze({
        csrfStorageKey: CSRF_STORAGE_KEY,
        managedStorageKeys: MANAGED_STORAGE_KEYS,
        fetch: window.fetch
    });

    window.PrimeWayStorage = Object.freeze({
        ready: hydrateState()
    });
})();
