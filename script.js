/**
 * Script principal pour le site de mariage
 * Gère l'authentification et la vérification d'accès
 */

// Nom de la clé pour le localStorage
const AUTH_TOKEN_KEY = 'wedding_auth_token';

// Pages qui ne nécessitent pas d'authentification
const PUBLIC_PAGES = ['auth.html'];

// Variables globales pour les noms des mariés (décryptés après authentification)
let groomName = '';
let brideName = '';

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean}
 */
function isAuthenticated() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token !== null && token !== '';
}

/**
 * Enregistre le token d'authentification
 * @param {string} token - Token reçu du backend
 */
function setAuthToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Supprime le token d'authentification
 */
function clearAuthToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Vérifie l'authentification via le Google Apps Script
 * @param {string} identifier - Clé d'accès ou prénom d'un des mariés
 * @returns {Promise<Object|null>} Retourne l'objet {status, token} ou null en cas d'erreur
 */
async function verifyAuthentication(identifier) {
    try {
        const formData = new FormData();
        formData.append('identifiers', identifier);

        const response = await fetch(CONFIG.AUTH_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
        });

        if (!response.ok) throw new Error('Erreur de vérification');
        return await response.json();

    } catch (error) {
        console.error('[AUTH] Erreur:', error);
        return null;
    }
}

/**
 * Ouvre les portes avec animation
 */
function openDoors() {
    const doorContainer = document.getElementById('doorContainer');
    const mainContent = document.getElementById('mainContent');

    if (!doorContainer || !mainContent) return;

    // Ajouter la classe pour déclencher l'animation
    doorContainer.classList.add('opening');

    // Activer immédiatement le contenu principal
    mainContent.classList.add('visible');

    // Marquer l'animation comme vue
    sessionStorage.setItem('doorAnimationSeen', 'true');

    // Masquer complètement le container après l'animation
    setTimeout(() => {
        doorContainer.classList.add('hidden');
    }, 2000);
}

/**
 * Vérifie l'authentification et gère l'animation des portes
 */
async function checkAuthentication() {
    // Vérification minimale de crypto.subtle (requis pour le déchiffrement)
    if (!window.crypto?.subtle) {
        console.error('[AUTH] Web Crypto API non disponible - Site doit être en HTTPS');
        return;
    }

    // Obtenir le nom de la page actuelle
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Ne pas vérifier l'auth sur les pages publiques
    if (PUBLIC_PAGES.includes(currentPage)) return;

    // Vérifier s'il y a une clé dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const cle = urlParams.get('cle');

    if (cle) {
        // Vérifier la clé via l'API
        const authData = await verifyAuthentication(cle);

        if (authData?.status === 'ok' && authData.token) {
            // Stocker le token et nettoyer l'URL
            setAuthToken(authData.token);
            window.history.replaceState({}, document.title, window.location.pathname);

            // Décrypter les contenus
            await decryptNames();
            await decryptAllImages();

            // Ouvrir les portes
            setTimeout(openDoors, 1500);
            return;
        }
    }

    // Vérifier si l'utilisateur est authentifié
    if (!isAuthenticated()) {
        window.location.href = `/auth?page=${currentPage}`;
    } else {
        // Décrypter les contenus
        await decryptNames();
        await decryptAllImages();

        // Ouvrir les portes
        setTimeout(openDoors, 1500);
    }
}

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthentication();

    // Vérifier le déchiffrement après un délai
    setTimeout(() => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token && token !== 'authenticated') {
            const hasPlaceholders = document.body.innerHTML.includes('{{bride_groom}}') ||
                                   document.body.innerHTML.includes('{{groom_bride}}') ||
                                   document.body.innerHTML.includes('{{groom}}') ||
                                   document.body.innerHTML.includes('{{bride}}');

            if (hasPlaceholders) {
                decryptNames();
            }
        }
    }, 1000);

    document.body.classList.add('loaded');
    initDoorAnimation();
    initMobileMenu();
    initScrollAnimations();
});

/**
 * Initialise l'animation d'ouverture des portes (pour index.html uniquement)
 */
function initDoorAnimation() {
    const doorContainer = document.getElementById('doorContainer');
    const mainContent = document.getElementById('mainContent');

    // Vérifier que nous sommes sur la page d'accueil
    if (!doorContainer || !mainContent) {
        return;
    }

    // Vérifier si l'utilisateur a déjà vu l'animation
    const hasSeenAnimation = sessionStorage.getItem('doorAnimationSeen');

    if (hasSeenAnimation) {
        // Masquer directement l'animation et montrer le contenu
        doorContainer.classList.add('hidden');
        mainContent.classList.add('visible');
        return;
    }

    // L'animation se déclenchera automatiquement via checkAuthentication()
    // si l'utilisateur est authentifié ou a une clé valide
}

/**
 * Initialise le menu mobile
 */
function initMobileMenu() {
    // Cette fonction peut être étendue pour ajouter un burger menu sur mobile
    const navMenu = document.querySelector('.nav-menu');

    if (!navMenu) return;

    // Fermer le menu au clic sur un lien (utile pour mobile)
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Logique pour fermer le menu mobile si implémenté
        });
    });
}

/**
 * Initialise les animations au scroll
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observer tous les éléments avec la classe .animate
    const animatedElements = document.querySelectorAll('.timeline-item, .info-card, .gallery-item, .cadeau-card');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

/**
 * Navigation smooth vers les ancres
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Ignorer les liens # simples
        if (href === '#') return;

        e.preventDefault();

        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

/**
 * Effet sticky sur la navbar
 */
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');

    if (!navbar) return;

    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

/**
 * Déconnexion (pour les tests)
 */
function logout() {
    clearAuthToken();
    window.location.href = '/auth';
}

// Exposer les fonctions globalement (utiles pour les tests et le debugging)
window.logout = logout;

/**
 * Fonction de diagnostic pour debugger les problèmes de déchiffrement
 * Appeler dans la console: window.debugDecryption()
 */
window.debugDecryption = function() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const bodyHTML = document.body.innerHTML;
    const counts = {
        bride_groom: (bodyHTML.match(/\{\{bride_groom\}\}/g) || []).length,
        groom_bride: (bodyHTML.match(/\{\{groom_bride\}\}/g) || []).length,
        groom: (bodyHTML.match(/\{\{groom\}\}/g) || []).length,
        bride: (bodyHTML.match(/\{\{bride\}\}/g) || []).length
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    console.log('=== DIAGNOSTIC DE DÉCHIFFREMENT ===');
    console.log('Token:', token ? `${token.substring(0, 30)}...` : 'Aucun');
    console.log('Noms déchiffrés:', groomName || 'NON', '/', brideName || 'NON');
    console.log('Placeholders restants:', counts);
    console.log(total > 0 ? `⚠️ ${total} placeholder(s) non remplacé(s)` : '✅ OK');
    console.log('=================================');
};

/**
 * Force le remplacement des noms (pour debugging)
 */
window.forceReplaceNames = () => decryptNames();

/**
 * Affiche un message de confirmation
 * @param {HTMLElement} messageElement - L'élément DOM pour afficher le message
 * @param {string} type - Type de message ('success' ou 'error')
 * @param {string} message - Le message à afficher
 */
function showConfirmation(messageElement, type, message) {
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `confirmation-message ${type} show`;
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        messageElement.classList.remove('show');
    }, 8000);
}

/**
 * Active/désactive l'état de chargement d'un bouton de soumission
 * @param {boolean} loading - true pour activer le chargement, false pour le désactiver
 * @param {HTMLElement} submitBtn - Le bouton de soumission
 * @param {HTMLElement} btnText - L'élément contenant le texte du bouton
 * @param {HTMLElement} btnLoader - L'élément du loader
 */
function setLoading(loading, submitBtn, btnText, btnLoader) {
    if (!submitBtn || !btnText || !btnLoader) return;

    if (loading) {
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
    } else {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

/**
 * Décrypte une image encryptée avec le token
 * @param {string} encryptedImagePath - Chemin vers l'image encryptée (.enc)
 * @param {string} token - Token d'authentification (clé de décryptage)
 * @returns {Promise<string>} URL blob de l'image décryptée
 */
async function decryptImage(encryptedImagePath, token) {
    try {
        // Charger l'image encryptée
        const response = await fetch(encryptedImagePath);
        if (!response.ok) throw new Error(`Erreur chargement: ${response.status}`);

        const encryptedData = await response.arrayBuffer();

        // Les 16 premiers bytes sont l'IV, le reste est l'image encryptée
        const iv = new Uint8Array(encryptedData.slice(0, 16));
        const encrypted = encryptedData.slice(16);

        // Dériver la clé du token (SHA-256)
        const encoder = new TextEncoder();
        const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(token));
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyHash,
            { name: 'AES-CBC', length: 256 },
            false,
            ['decrypt']
        );

        // Décrypter
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv },
            cryptoKey,
            encrypted
        );

        // Créer un Blob et retourner l'URL
        return URL.createObjectURL(new Blob([decrypted], { type: 'image/png' }));

    } catch (error) {
        console.error(`[DECRYPT] Erreur image ${encryptedImagePath}:`, error);
        throw error;
    }
}

/**
 * Décrypte et applique une image à un élément IMG
 * @param {HTMLImageElement} imgElement - Élément IMG du DOM
 * @param {string} encryptedPath - Chemin vers l'image encryptée
 * @param {string} token - Token d'authentification
 */
async function loadEncryptedImage(imgElement, encryptedPath, token) {
    if (!imgElement || !encryptedPath || !token) return;

    try {
        imgElement.style.opacity = '0.3';
        imgElement.src = await decryptImage(encryptedPath, token);
        imgElement.onload = () => {
            imgElement.style.opacity = '1';
            imgElement.style.transition = 'opacity 0.3s ease';
        };
    } catch (error) {
        console.error('[DECRYPT] Erreur chargement image:', error);
        imgElement.alt = 'Image non disponible';
        imgElement.style.opacity = '1';
    }
}

/**
 * Décrypte toutes les images avec l'attribut data-encrypted
 */
async function decryptAllImages() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || token === 'authenticated') return;

    const encryptedImages = document.querySelectorAll('[data-encrypted]');
    await Promise.all(
        Array.from(encryptedImages).map(img =>
            loadEncryptedImage(img, img.dataset.encrypted, token)
        )
    );
}

/**
 * Décode une chaîne base64 en Uint8Array
 * @param {string} base64 - Chaîne en base64
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Décrypte un texte chiffré avec AES-256-CBC
 * @param {string} encryptedText - Texte chiffré (format iv:encrypted en base64)
 * @param {string} key - Clé de déchiffrement
 * @returns {Promise<string>} Texte déchiffré
 */
async function decryptText(encryptedText, key) {
    try {
        // Séparer IV et données chiffrées
        const [ivBase64, encryptedBase64] = encryptedText.split(':');
        const iv = base64ToUint8Array(ivBase64);
        const encryptedData = base64ToUint8Array(encryptedBase64);

        // Créer un hash SHA-256 de la clé pour obtenir 32 bytes
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const keyHash = await crypto.subtle.digest('SHA-256', keyData);

        // Importer la clé
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyHash,
            { name: 'AES-CBC', length: 256 },
            false,
            ['decrypt']
        );

        // Déchiffrer
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv: iv },
            cryptoKey,
            encryptedData
        );

        // Convertir en string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);

    } catch (error) {
        console.error('[DECRYPT] Erreur déchiffrement texte:', error);
        throw error;
    }
}

/**
 * Décrypte les noms des mariés et met à jour les variables globales
 */
async function decryptNames() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token || token === 'authenticated' || !CONFIG.ENCRYPTED_NAMES) {
        return;
    }

    try {
        groomName = await decryptText(CONFIG.ENCRYPTED_NAMES.groom, token);
        brideName = await decryptText(CONFIG.ENCRYPTED_NAMES.bride, token);
        replaceNamePlaceholders();
    } catch (error) {
        console.error('[DECRYPT] Erreur déchiffrement des noms:', error);
    }
}

/**
 * Remplace tous les placeholders de noms dans le DOM
 */
function replaceNamePlaceholders() {
    if (!groomName || !brideName) return;

    // Remplacer dans le titre de la page
    if (document.title.includes('{{')) {
        document.title = document.title
            .replace(/\{\{groom\}\}/g, groomName)
            .replace(/\{\{bride\}\}/g, brideName)
            .replace(/\{\{bride_groom\}\}/g, `${brideName} & ${groomName}`)
            .replace(/\{\{groom_bride\}\}/g, `${groomName} & ${brideName}`);
    }

    // Remplacer dans tout le document body
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const nodesToReplace = [];
    let node;

    while (node = walker.nextNode()) {
        const text = node.nodeValue;
        if (text && (text.includes('{{groom}}') || text.includes('{{bride}}') ||
            text.includes('{{groom_bride}}') || text.includes('{{bride_groom}}'))) {
            nodesToReplace.push(node);
        }
    }

    // Effectuer les remplacements
    nodesToReplace.forEach(node => {
        node.nodeValue = node.nodeValue
            .replace(/\{\{groom\}\}/g, groomName)
            .replace(/\{\{bride\}\}/g, brideName)
            .replace(/\{\{bride_groom\}\}/g, `${brideName} & ${groomName}`)
            .replace(/\{\{groom_bride\}\}/g, `${groomName} & ${brideName}`);
    });
}

/**
 * Animation des feux d'artifice
 * Utilisée pour les pages de validation (RSVP et Faire-part)
 */
function startFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const rockets = [];
    const particles = [];
    const particleCount = 150;

    class Rocket {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.targetY = Math.random() * canvas.height * 0.4 + canvas.height * 0.1;
            this.vy = -6;
            this.vx = (Math.random() - 0.5) * 4;
            this.exploded = false;
            this.alpha = 1;
            this.trail = [];
        }

        update() {
            if (!this.exploded) {
                // Ajouter la position actuelle au trail
                this.trail.push({x: this.x, y: this.y});
                // Garder seulement les 20 dernières positions
                if (this.trail.length > 20) {
                    this.trail.shift();
                }

                this.x += this.vx;
                this.y += this.vy;
                if (this.y <= this.targetY) {
                    this.explode();
                }
            }
        }

        draw() {
            if (!this.exploded && this.trail.length > 1) {
                ctx.save();
                // Dessiner le trail avec un dégradé
                for (let i = 0; i < this.trail.length - 1; i++) {
                    const alpha = (i / this.trail.length) * 0.8;
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = '#a66068';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(this.trail[i].x, this.trail[i].y);
                    ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        explode() {
            this.exploded = true;
            // Créer une explosion plus ronde avec des angles uniformes
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 * i) / particleCount;
                const speed = Math.random() * 2 + 2;
                particles.push(new Particle(this.x, this.y, angle, speed));
            }
        }
    }

    class Particle {
        constructor(x, y, angle, speed) {
            this.x = x;
            this.y = y;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.alpha = 1;
            this.decay = Math.random() * 0.01 + 0.005;
            // Variations de la couleur primaire #a66068
            this.color = `hsl(352, ${Math.random() * 20 + 30}%, ${Math.random() * 20 + 50}%)`;
        }

        update() {
            this.vx *= 0.99;
            this.vy *= 0.99;
            this.vy += 0.02;
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function createFirework() {
        rockets.push(new Rocket());
    }

    function animate() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw rockets
        for (let i = rockets.length - 1; i >= 0; i--) {
            rockets[i].update();
            rockets[i].draw();
            if (rockets[i].exploded) {
                rockets.splice(i, 1);
            }
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].alpha <= 0) {
                particles.splice(i, 1);
            }
        }

        requestAnimationFrame(animate);
    }

    // Créer plusieurs feux d'artifice au démarrage
    for (let i = 0; i < 3; i++) {
        setTimeout(() => createFirework(), i * 300);
    }

    // Créer des feux d'artifice à intervalles réguliers (2-3 à la fois)
    setInterval(() => {
        const count = Math.floor(Math.random() * 2) + 2; // 2 ou 3 fusées
        for (let i = 0; i < count; i++) {
            setTimeout(() => createFirework(), i * 200);
        }
    }, 2000);

    animate();
}
