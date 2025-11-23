/**
 * Script pour chiffrer les noms des mariés
 * Usage: node encrypt-names.js <TOKEN_AUTH> <GROOM_NAME> <BRIDE_NAME>
 *
 * Le token d'authentification doit être le même que celui retourné par le service d'auth
 */

const crypto = require('crypto');

// Récupérer les paramètres depuis les arguments
const ENCRYPTION_KEY = process.argv[2];
const GROOM_NAME = process.argv[3];
const BRIDE_NAME = process.argv[4];

if (!ENCRYPTION_KEY || !GROOM_NAME || !BRIDE_NAME) {
    console.error('❌ Erreur: Paramètres manquants');
    console.log('\nUsage: node encrypt-names.js <TOKEN_AUTH> <GROOM_NAME> <BRIDE_NAME>');
    console.log('Exemple: node encrypt-names.js "your-token-here" "John" "Jane"');
    process.exit(1);
}

/**
 * Chiffre une chaîne de texte avec AES-256-CBC
 * @param {string} text - Texte à chiffrer
 * @param {string} key - Clé de chiffrement
 * @returns {string} Texte chiffré en base64 (iv:encrypted)
 */
function encryptText(text, key) {
    // Créer un hash SHA-256 de la clé pour obtenir exactement 32 bytes
    const keyHash = crypto.createHash('sha256').update(key).digest();

    // Générer un IV aléatoire de 16 bytes
    const iv = crypto.randomBytes(16);

    // Créer le cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);

    // Chiffrer le texte
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Retourner IV:encrypted en base64
    return iv.toString('base64') + ':' + encrypted;
}

/**
 * Déchiffre une chaîne chiffrée
 * @param {string} encryptedText - Texte chiffré (format iv:encrypted)
 * @param {string} key - Clé de déchiffrement
 * @returns {string} Texte déchiffré
 */
function decryptText(encryptedText, key) {
    // Séparer IV et données chiffrées
    const [ivBase64, encrypted] = encryptedText.split(':');

    // Créer un hash SHA-256 de la clé
    const keyHash = crypto.createHash('sha256').update(key).digest();

    // Convertir l'IV depuis base64
    const iv = Buffer.from(ivBase64, 'base64');

    // Créer le decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);

    // Déchiffrer
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// Chiffrer les noms
console.log('Chiffrement des noms des mariés...\n');

const encryptedGroom = encryptText(GROOM_NAME, ENCRYPTION_KEY);
const encryptedBride = encryptText(BRIDE_NAME, ENCRYPTION_KEY);

console.log('Noms chiffrés :');
console.log('================');
console.log(`groom: '${encryptedGroom}'`);
console.log(`bride: '${encryptedBride}'`);
console.log('\n');

// Test de déchiffrement
console.log('Vérification du déchiffrement :');
console.log('================================');
console.log(`Groom décrypté: ${decryptText(encryptedGroom, ENCRYPTION_KEY)}`);
console.log(`Bride décryptée: ${decryptText(encryptedBride, ENCRYPTION_KEY)}`);
console.log('\n');

console.log('✅ Chiffrement terminé avec succès !');
console.log('\nCopiez les valeurs ci-dessus dans config.js');
