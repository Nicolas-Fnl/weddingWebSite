/**
 * Configuration du site de mariage
 *
 * IMPORTANT: Configurez les URLs de vos Google Apps Scripts ici
 */

const CONFIG = {
    // URL du Google Apps Script pour l'authentification
    AUTH_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzpPX95ofTw13kWryqX-OqHGEnCMngevXJIB_hwoRl949HAMmmIh-RYlhQ2caSq3rtL6g/exec',

    // URL du Google Apps Script pour le formulaire RSVP
    RSVP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxxBT5JPP7W1qDcMvY6OoyyrNpLBV9wPRHr16eYfbKq_DqNcwR_H40Vihve7mtfx5n1rw/exec',

    // URL du Google Apps Script pour le formulaire de contact
    CONTACT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbymP5OGCQqtSCEueOYcfllN3fbuCoo2Hcfld2wpCIH3z67yV5bur9Ijl48hi4ON38Oi/exec',

    // Paramètres du site
    WEDDING_DATE: '2026-06-20T15:00:00',

    // Mode faire-part uniquement (redirection forcée vers fairepart.html)
    // Mettre à false pour ouvrir l'accès à tout le site
    FAIREPART_ONLY_MODE: false,

    // Noms des mariés (chiffrés avec le token d'authentification)
    ENCRYPTED_NAMES: {
        groom: 'Kw7muoUVTM8S3zg6xjUcLQ==:AMCeF36ZkGDpxpPpj1VxUA==',
        bride: 'DS7N0qEI/Pyc2+uf79SrNw==:JqOgk7F5otNpoktKQ4ynAg=='
    }
};

// Ne pas modifier en dessous de cette ligne
Object.freeze(CONFIG);
