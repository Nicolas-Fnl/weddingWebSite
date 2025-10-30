/**
 * Script d'encryption des images
 * Utilise le token d'authentification comme clé de chiffrement
 *
 * Usage:
 *   node encrypt-images.js --token="votre-token"
 *   ou
 *   node encrypt-images.js (mode interactif)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Parse les arguments de ligne de commande
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const parsedArgs = {};

    for (const arg of args) {
        if (arg.startsWith('--token=')) {
            parsedArgs.token = arg.substring(8).replace(/^["']|["']$/g, ''); // Retire --token= et les quotes
        } else if (arg === '--help' || arg === '-h') {
            parsedArgs.help = true;
        }
    }

    return parsedArgs;
}

/**
 * Affiche l'aide
 */
function showHelp() {
    console.log(`
🔐 Script d'encryption des images

Usage:
  node encrypt-images.js --token="votre-token"
  node encrypt-images.js                        (mode interactif)

Options:
  --token=TOKEN    Spécifier le token directement
  --help, -h       Afficher cette aide

Exemples:
  # Avec argument (recommandé)
  node encrypt-images.js --token="VOTRE-TOKEN-ICI"

  # Mode interactif (le script demandera le token)
  node encrypt-images.js

Note: Le token doit être identique à celui retourné par votre API d'authentification.
`);
}

/**
 * Demande le token à l'utilisateur de manière interactive
 */
async function promptForToken() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('\n🔑 Entrez le token d\'authentification (retourné par votre API):\n> ', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Dérive une clé de 32 bytes à partir du token
 */
function deriveKey(token) {
    // Utiliser SHA-256 pour obtenir une clé de 32 bytes à partir du token
    return crypto.createHash('sha256').update(token).digest();
}

/**
 * Encrypte une image
 */
function encryptImage(inputPath, outputPath, token) {
    try {
        // Lire l'image
        const imageBuffer = fs.readFileSync(inputPath);

        // Générer un IV (Initialization Vector) aléatoire
        const iv = crypto.randomBytes(16);

        // Dériver la clé du token
        const key = deriveKey(token);

        // Créer le cipher
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        // Encrypter
        const encrypted = Buffer.concat([
            cipher.update(imageBuffer),
            cipher.final()
        ]);

        // Sauvegarder : IV (16 bytes) + données encryptées
        const result = Buffer.concat([iv, encrypted]);
        fs.writeFileSync(outputPath, result);

        const originalSize = imageBuffer.length;
        const encryptedSize = result.length;

        console.log(`✅ ${path.basename(inputPath)}`);
        console.log(`   → ${path.basename(outputPath)}`);
        console.log(`   Taille: ${originalSize} bytes → ${encryptedSize} bytes`);
        console.log('');

        return true;
    } catch (error) {
        console.error(`❌ Erreur pour ${inputPath}:`, error.message);
        return false;
    }
}

/**
 * Fonction principale
 */
async function main() {
    // Parser les arguments de ligne de commande
    const cmdArgs = parseArguments();

    // Afficher l'aide si demandé
    if (cmdArgs.help) {
        showHelp();
        process.exit(0);
    }

    // Dossier des images
    const imagesDir = path.join(__dirname, 'images');

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('📁 Dossier images/ créé\n');
    }

    // Trouver toutes les images PNG dans le dossier images/
    const imageFiles = fs.readdirSync(imagesDir)
        .filter(file => file.endsWith('.png') && !file.endsWith('.enc'));

    if (imageFiles.length === 0) {
        console.log('⚠️  Aucune image .png trouvée dans le dossier images/');
        console.log('📝 Placez vos images dans le dossier images/ puis relancez ce script.');
        process.exit(0);
    }

    console.log('🔐 Encryption des images');
    console.log(`📷 ${imageFiles.length} image(s) trouvée(s): ${imageFiles.join(', ')}`);

    // Récupérer le token dans cet ordre de priorité :
    // 1. Argument --token=
    // 2. Mode interactif (demander à l'utilisateur)
    let authToken = cmdArgs.token;

    if (!authToken) {
        authToken = await promptForToken();
    }

    if (!authToken || authToken.length === 0) {
        console.error('\n❌ Token vide ou invalide. Arrêt du script.');
        process.exit(1);
    }

    console.log(`\n✅ Token reçu (${authToken.length} caractères)`);
    console.log(`🔒 Début de l'encryption...\n`);

    let successCount = 0;
    let errorCount = 0;

    imageFiles.forEach(filename => {
        const inputPath = path.join(imagesDir, filename);
        const outputPath = path.join(imagesDir, filename + '.enc');

        if (encryptImage(inputPath, outputPath, authToken)) {
            successCount++;
        } else {
            errorCount++;
        }
    });

    console.log('─'.repeat(60));
    console.log(`✅ ${successCount} image(s) encryptée(s)`);
    if (errorCount > 0) {
        console.log(`❌ ${errorCount} erreur(s)`);
    }
    console.log('');
    console.log('📝 Prochaines étapes:');
    console.log('   1. Vérifier les fichiers .enc créés dans images/');
    console.log('   2. Les images originales (.png) peuvent être supprimées');
    console.log('   3. Ajouter images/*.enc à Git');
    console.log('   4. Ajouter images/*.png au .gitignore');
    console.log('');
    console.log('💡 Astuce: Pour éviter de retaper le token:');
    console.log('   node encrypt-images.js --token="votre-token"');
}

// Exécuter la fonction principale
main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});
