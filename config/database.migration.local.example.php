<?php

declare(strict_types=1);

/*
    Copie para database.migration.local.php somente durante
    atualizações do schema. Use uma conta com CREATE/ALTER.
*/

return [
    'user' => 'primeway_migracao',
    'password' => '' // Preencher somente no arquivo local ignorado pelo Git.
];
