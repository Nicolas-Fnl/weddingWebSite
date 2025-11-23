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
    FAIREPART_ONLY_MODE: true,

    // Noms des mariés (chiffrés avec le token d'authentification)
    ENCRYPTED_NAMES: {
        groom: 'Kw7muoUVTM8S3zg6xjUcLQ==:AMCeF36ZkGDpxpPpj1VxUA==',
        bride: 'DS7N0qEI/Pyc2+uf79SrNw==:JqOgk7F5otNpoktKQ4ynAg=='
    },

    // Identifiants Spotify (chiffrés avec le token d'authentification)
    ENCRYPTED_SPOTIFY: {
        clientId: 'z65WJhY/mK1BLXGCF+K/9A==:2qvWnfWg88mzj/LzjQXypV/072y5gLI0Z9vml/4on24IV2X60Vq79tFMDkGPD8cP',
        clientSecret: 'HDod9levOWERVdjYgleWbg==:2A12egvBEkWzhLuC2U8cwjeVBcdnadvZYjugvHUOMiH6GwvYTqbKgwc5Z4rkZgrG'
    },

    // Configuration de la playlist Spotify
    SPOTIFY_PLAYLIST_ID: '2SG2i3bNBcjY588t2M1BNJ',
    SPOTIFY_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyknXZGKFcS06roVJeTdEOPiNPgOw5cPiQU1Wc1tmlvCa5l6kQqHo9G83prnvjCW66f/exec',

    // Lien WhatsApp communauté (chiffré avec le token d'authentification)
    ENCRYPTED_WHATSAPP_LINK: 'yw3bOmSa1HKVBVtrUMsRTQ==:CL3/rYOYaMRJVAgPG28m/U7qPXqc8OqSUjiMRjUvpwOVR37EnV2jgJVgrYEsGg9iH8Ea52jl/lRl5bjfsw2Pmg=='
};

// Ne pas modifier en dessous de cette ligne
Object.freeze(CONFIG);
