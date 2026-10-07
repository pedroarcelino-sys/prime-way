(function () {
    "use strict";
    const CSRF_STORAGE_KEY = "primewayCsrfToken";
    const RETIRED_STORAGE_KEYS = new Set([
        "primewayGuardians", "primewayClasses", "primewayChatProfessor",
        "primewayNotifications", "primewayCalendarEvents", "primewaySubjects",
        "primewayStudents", "primewaySettings", "primewayDataModelVersion"
    ]);
    const originalFetch = window.fetch.bind(window);
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    // Somente caches aposentados; sessão e dados relacionais permanecem nas APIs.
    for (const key of RETIRED_STORAGE_KEYS) originalRemoveItem.call(window.localStorage, key);
    Storage.prototype.setItem = function primewaySetItem(key, value) {
        if (this === window.localStorage && RETIRED_STORAGE_KEYS.has(String(key))) return;
        originalSetItem.call(this, key, value);
    };
    function isApiRequest(input) {
        try {
            const rawUrl =
                input instanceof Request
                    ? input.url
                    : String(input);
            const url = new URL(rawUrl, document.baseURI);

            return (
                url.origin === window.origin &&
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

/*====================================================
            FEEDBACK GLOBAL - PRIMEWAY
====================================================*/

const FEEDBACK_TYPES =
    new Set([
        "success",
        "error",
        "warning",
        "info"
    ]);


const FEEDBACK_ICONS = {
    success:
        "fa-solid fa-circle-check",

    error:
        "fa-solid fa-circle-exclamation",

    warning:
        "fa-solid fa-triangle-exclamation",

    info:
        "fa-solid fa-circle-info"
};


function getFeedbackContainer() {

    let container =
        document.querySelector(
            ".primeway-toast-container"
        );


    if (container) {

        return container;
    }


    container =
        document.createElement(
            "div"
        );


    container.className =
        "primeway-toast-container";


    container.setAttribute(
        "aria-live",
        "polite"
    );


    container.setAttribute(
        "aria-atomic",
        "false"
    );


    document.body.appendChild(
        container
    );


    return container;
}


function removeFeedback(
    toast
) {

    if (
        !toast ||
        toast.classList.contains(
            "is-leaving"
        )
    ) {

        return;
    }


    toast.classList.add(
        "is-leaving"
    );


    window.setTimeout(
        () => {

            toast.remove();

        },
        180
    );
}


function showFeedback(
    message,
    type = "info",
    options = {}
) {

    const text =
        String(
            message ?? ""
        ).trim();


    if (!text) {

        return null;
    }


    const normalizedType =
        FEEDBACK_TYPES.has(type)
            ? type
            : "info";


    const container =
        getFeedbackContainer();


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `primeway-toast ${normalizedType}`;


    toast.setAttribute(
        "role",
        normalizedType === "error"
            ? "alert"
            : "status"
    );


    /* ÍCONE */

    const iconBox =
        document.createElement(
            "div"
        );


    iconBox.className =
        "primeway-toast-icon";


    const icon =
        document.createElement(
            "i"
        );


    icon.className =
        FEEDBACK_ICONS[
            normalizedType
        ];


    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    iconBox.appendChild(
        icon
    );


    /* CONTEÚDO */

    const content =
        document.createElement(
            "div"
        );


    content.className =
        "primeway-toast-content";


    if (
        options.title
    ) {

        const title =
            document.createElement(
                "strong"
            );


        title.className =
            "primeway-toast-title";


        title.textContent =
            String(
                options.title
            );


        content.appendChild(
            title
        );
    }


    const messageElement =
        document.createElement(
            "span"
        );


    messageElement.className =
        "primeway-toast-message";


    messageElement.textContent =
        text;


    content.appendChild(
        messageElement
    );


    /* FECHAR */

    const closeButton =
        document.createElement(
            "button"
        );


    closeButton.type =
        "button";


    closeButton.className =
        "primeway-toast-close";


    closeButton.setAttribute(
        "aria-label",
        "Fechar mensagem"
    );


    closeButton.innerHTML = `
        <i
            class="fa-solid fa-xmark"
            aria-hidden="true"
        ></i>
    `;


    closeButton.addEventListener(
        "click",
        () =>
            removeFeedback(
                toast
            )
    );


    toast.append(
        iconBox,
        content,
        closeButton
    );


    container.appendChild(
        toast
    );


    const defaultDuration =
        normalizedType === "error"
            ? 6000
            : 4000;


    const duration =
        Number.isFinite(
            options.duration
        )
            ? options.duration
            : defaultDuration;


    if (
        duration > 0
    ) {

        window.setTimeout(
            () =>
                removeFeedback(
                    toast
                ),
            duration
        );
    }


    return toast;
}


function clearFeedbacks() {

    document
        .querySelectorAll(
            ".primeway-toast"
        )
        .forEach(
            removeFeedback
        );
}


window.PrimeWayFeedback =
    Object.freeze({

        show:
            showFeedback,


        success(
            message,
            options = {}
        ) {

            return showFeedback(
                message,
                "success",
                options
            );
        },


        error(
            message,
            options = {}
        ) {

            return showFeedback(
                message,
                "error",
                options
            );
        },


        warning(
            message,
            options = {}
        ) {

            return showFeedback(
                message,
                "warning",
                options
            );
        },


        info(
            message,
            options = {}
        ) {

            return showFeedback(
                message,
                "info",
                options
            );
        },


        clear:
            clearFeedbacks
    });


/*====================================================
            CONFIRMAÇÃO GLOBAL - PRIMEWAY
====================================================*/

let primewayConfirmCounter = 0;


function primewayConfirm(
    message,
    options = {}
) {

    const text =
        String(
            message ?? ""
        ).trim();


    if (!text) {

        return Promise.resolve(
            false
        );
    }


    const type =
        ["info", "warning", "danger"]
            .includes(
                options.type
            )
                ? options.type
                : "info";


    const title =
        String(
            options.title ||
            (
                type === "danger"
                    ? "Confirmar ação"
                    : type === "warning"
                        ? "Atenção"
                        : "Confirmação"
            )
        );


    const confirmText =
        String(
            options.confirmText ||
            "Confirmar"
        );


    const cancelText =
        String(
            options.cancelText ||
            "Cancelar"
        );


    const iconClass =
        type === "danger"
            ? "fa-solid fa-triangle-exclamation"
            : type === "warning"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-circle-question";


    primewayConfirmCounter += 1;


    const confirmId =
        `primewayConfirmTitle${primewayConfirmCounter}`;


    const messageId =
        `primewayConfirmMessage${primewayConfirmCounter}`;


    return new Promise(
        resolve => {

            const previousFocus =
                document.activeElement;


            const previousOverflow =
                document.body.style.overflow;


            const root =
                document.createElement(
                    "div"
                );


            root.className =
                `primeway-confirm ${type}`;


            root.innerHTML = `
                <div
                    class="primeway-confirm-backdrop"
                    data-primeway-confirm-cancel
                ></div>

                <div
                    class="primeway-confirm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="${confirmId}"
                    aria-describedby="${messageId}"
                >

                    <div
                        class="primeway-confirm-content"
                    >

                        <div
                            class="primeway-confirm-icon"
                            aria-hidden="true"
                        >
                            <i
                                class="${iconClass}"
                            ></i>
                        </div>


                        <div
                            class="primeway-confirm-text"
                        >

                            <h2
                                class="primeway-confirm-title"
                                id="${confirmId}"
                            ></h2>

                            <p
                                class="primeway-confirm-message"
                                id="${messageId}"
                            ></p>

                        </div>

                    </div>


                    <div
                        class="primeway-confirm-actions"
                    >

                        <button
                            type="button"
                            class="
                                primeway-confirm-button
                                primeway-confirm-cancel
                            "
                            data-primeway-confirm-cancel
                        >
                            Cancelar
                        </button>


                        <button
                            type="button"
                            class="
                                primeway-confirm-button
                                primeway-confirm-accept
                            "
                            data-primeway-confirm-accept
                        >
                            Confirmar
                        </button>

                    </div>

                </div>
            `;


            const titleElement =
                root.querySelector(
                    ".primeway-confirm-title"
                );


            const messageElement =
                root.querySelector(
                    ".primeway-confirm-message"
                );


            const acceptButton =
                root.querySelector(
                    "[data-primeway-confirm-accept]"
                );


            const cancelButton =
                root.querySelector(
                    ".primeway-confirm-cancel"
                );


            titleElement.textContent =
                title;


            messageElement.textContent =
                text;


            acceptButton.textContent =
                confirmText;


            cancelButton.textContent =
                cancelText;


            document.body.appendChild(
                root
            );


            document.body.style.overflow =
                "hidden";


            let finished =
                false;


            function finish(
                result
            ) {

                if (finished) {

                    return;
                }


                finished =
                    true;


                document.removeEventListener(
                    "keydown",
                    handleKeydown
                );


                root.classList.remove(
                    "show"
                );


                window.setTimeout(
                    () => {

                        root.remove();


                        document.body.style.overflow =
                            previousOverflow;


                        if (
                            previousFocus &&
                            typeof previousFocus.focus ===
                            "function" &&
                            document.contains(
                                previousFocus
                            )
                        ) {

                            previousFocus.focus();
                        }

                    },
                    200
                );


                resolve(
                    result
                );
            }


            function handleKeydown(
                event
            ) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    finish(
                        false
                    );

                    return;
                }


                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    finish(
                        true
                    );
                }
            }


            root.addEventListener(
                "click",
                event => {

                    const accept =
                        event.target.closest(
                            "[data-primeway-confirm-accept]"
                        );


                    if (accept) {

                        finish(
                            true
                        );

                        return;
                    }


                    const cancel =
                        event.target.closest(
                            "[data-primeway-confirm-cancel]"
                        );


                    if (cancel) {

                        finish(
                            false
                        );
                    }
                }
            );


            document.addEventListener(
                "keydown",
                handleKeydown
            );


            window.requestAnimationFrame(
                () => {

                    root.classList.add(
                        "show"
                    );


                    cancelButton.focus();
                }
            );
        }
    );
}


window.PrimeWayConfirm =
    Object.freeze({

        show:
            primewayConfirm,


        async info(
            message,
            options = {}
        ) {

            return primewayConfirm(
                message,
                {
                    ...options,
                    type: "info"
                }
            );
        },


        async warning(
            message,
            options = {}
        ) {

            return primewayConfirm(
                message,
                {
                    ...options,
                    type: "warning"
                }
            );
        },


        async danger(
            message,
            options = {}
        ) {

            return primewayConfirm(
                message,
                {
                    ...options,
                    type: "danger"
                }
            );
        }
    });



    window.PrimeWay = Object.freeze({
        csrfStorageKey: CSRF_STORAGE_KEY,
        fetch: window.fetch
    });
})();
