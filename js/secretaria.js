document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const API =
            "../api/secretaria/index.php";

        const session =
            await window
                .PrimeWaySecretaria
                .ensureSecretary();

        if (!session) {
            return;
        }

        window
            .PrimeWaySecretaria
            .bindLogout();

        function statusClass(status) {
            if (status === "No raio") {
                return "warning";
            }

            if (status === "Preparando") {
                return "info";
            }

            return "neutral";
        }

        function renderQueue(items) {
            const box =
                document.querySelector(
                    "#pickupQueue"
                );

            box.replaceChildren();

            if (!items.length) {
                box.innerHTML =
                    '<div class="secretary-empty">'
                    +
                    '<i class="fa-solid fa-circle-check"></i>'
                    +
                    '<span>Nenhuma retirada aguardando atendimento.</span>'
                    +
                    '</div>';

                return;
            }

            for (const item of items) {
                const row =
                    document.createElement(
                        "article"
                    );

                row.className =
                    "secretary-queue-row";

                row.innerHTML = `
                    <div>
                        <strong>${escapeHtml(item.studentName)}</strong>
                        <span>${escapeHtml(item.guardianName)}</span>
                    </div>

                    <div>
                        <span class="secretary-status ${statusClass(item.status)}">
                            ${escapeHtml(item.status)}
                        </span>
                    </div>

                    <div>
                        <span>${window.PrimeWaySecretaria.formatDate(item.requestedAt, true)}</span>
                    </div>

                    <a
                        href="secretaria_saida_segura.html"
                        class="secretary-link-button"
                    >
                        Atender
                    </a>
                `;

                box.append(row);
            }
        }

        function escapeHtml(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        }

        async function load() {
            try {
                const {
                    response,
                    data
                } =
                    await window
                        .PrimeWaySecretaria
                        .request(API);

                if (
                    !response.ok
                    ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message
                        ||
                        "Não foi possível carregar o painel."
                    );
                }

                document.querySelector(
                    "#secretaryName"
                ).textContent =
                    data.profile.name;

                document.querySelector(
                    "#secretaryRole"
                ).textContent =
                    data.profile.jobTitle
                    || data.profile.sector
                    || "Secretaria";

                document.querySelector(
                    "#summaryStudents"
                ).textContent =
                    data.summary.students;

                document.querySelector(
                    "#summaryGuardians"
                ).textContent =
                    data.summary.guardians;

                document.querySelector(
                    "#summaryPickup"
                ).textContent =
                    data.summary.activePickup;

                document.querySelector(
                    "#summaryInside"
                ).textContent =
                    data.summary.insideRadius;

                document.querySelector(
                    "#summaryPreparing"
                ).textContent =
                    data.summary.preparing;

                document.querySelector(
                    "#summaryReleased"
                ).textContent =
                    data.summary.releasedToday;

                renderQueue(
                    data.pickupRequests
                    || []
                );

                await window
                    .PrimeWaySecretaria
                    .refreshNavigationBadges();

            } catch (error) {
                console.error(error);

                window.PrimeWayFeedback?.error(
                    error?.message
                    ||
                    "Não foi possível carregar o painel da Secretaria."
                );
            }
        }

        await load();

        window.setInterval(
            load,
            10000
        );
    }
);
