/**
 * Script principal pour le site de mariage
 * Gère l'authentification et la vérification d'accès
 */

// Nom de la clé pour le localStorage
const AUTH_TOKEN_KEY = 'wedding_auth_token';

// Pages qui ne nécessitent pas d'authentification (avec et sans .html pour GitHub Pages)
const PUBLIC_PAGES = ['auth.html', 'auth'];

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
    const currentPage = window.location.pathname.split('/').pop() || '';

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
        // Si on est à la racine (index.html ou /), rediriger sans paramètre page
        if (!currentPage || currentPage === 'index.html' || currentPage === 'index') {
            window.location.href = 'auth';
        } else {
            // Enlever l'extension .html du paramètre page
            const pageParam = currentPage.replace('.html', '');
            window.location.href = `auth?page=${pageParam}`;
        }
    } else {
        // Décrypter les contenus
        await decryptNames();
        await decryptAllImages();

        // Ouvrir les portes
        setTimeout(openDoors, 1500);
    }
}

/**
 * Initialise le bouton RSVP flottant
 */
function initFloatingRSVP() {
    // Obtenir le nom de la page actuelle (gérer à la fois .html et sans extension)
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || '';

    // Ne pas afficher le bouton sur la page RSVP, auth et fairepart
    const excludedPages = ['rsvp.html', 'rsvp', 'auth.html', 'auth', 'fairepart.html', 'fairepart'];

    // Vérifier si on est sur une page exclue
    if (excludedPages.some(page => currentPath.includes(page) || currentPage === page)) {
        return;
    }

    // Créer le bouton flottant
    const floatingBtn = document.createElement('a');
    floatingBtn.href = 'rsvp';
    floatingBtn.className = 'floating-rsvp-btn';

    // Ajouter classe spéciale pour la page index (style blanc)
    const isIndexPage = currentPage === '' || currentPage === 'index.html' || currentPage === 'index';
    if (isIndexPage) {
        floatingBtn.classList.add('floating-rsvp-btn-white');
    }

    floatingBtn.textContent = 'Confirmer ma présence !';

    // Style inline pour s'assurer de la visibilité
    floatingBtn.style.display = 'inline-block';
    floatingBtn.style.opacity = '0';

    // Ajouter le bouton au body
    document.body.appendChild(floatingBtn);

    // Déclencher l'animation de rebond une seule fois
    setTimeout(() => {
        floatingBtn.classList.add('bounce-in');

        // Après l'animation, retirer la classe ET fixer l'opacité à 1
        setTimeout(() => {
            floatingBtn.classList.remove('bounce-in');
            floatingBtn.style.opacity = '1';
        }, 2000);
    }, 100);

    // Ajouter l'animation pulse toutes les 8 secondes
    setInterval(() => {
        floatingBtn.classList.add('pulse');
        setTimeout(() => {
            floatingBtn.classList.remove('pulse');
        }, 300);
    }, 8000);

    // Cacher le bouton quand la section CTA est visible
    const ctaSection = document.querySelector('.cta-section');
    if (ctaSection) {
        const observerOptions = {
            threshold: 0.2,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Section CTA visible -> cacher le bouton
                    floatingBtn.style.opacity = '0';
                    floatingBtn.style.pointerEvents = 'none';
                } else {
                    // Section CTA non visible -> afficher le bouton
                    floatingBtn.style.opacity = '1';
                    floatingBtn.style.pointerEvents = 'auto';
                }
            });
        }, observerOptions);

        observer.observe(ctaSection);
    }

    // Empêcher le bouton de descendre plus bas que le footer (mobile uniquement)
    const footer = document.querySelector('.footer');
    if (footer) {
        window.addEventListener('scroll', () => {
            // Appliquer uniquement sur mobile (max 768px)
            if (window.innerWidth <= 768) {
                const footerRect = footer.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const defaultBottom = 30; // Distance par défaut du bas (en px)

                // Si le footer est visible à l'écran
                if (footerRect.top < windowHeight) {
                    // Calculer la distance du bas de la fenêtre au haut du footer
                    const distanceFromBottom = windowHeight - footerRect.top;
                    floatingBtn.style.bottom = `${distanceFromBottom}px`;
                } else {
                    // Position normale
                    floatingBtn.style.bottom = `${defaultBottom}px`;
                }
            } else {
                // Sur desktop, toujours position normale
                floatingBtn.style.bottom = '30px';
            }
        });
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
    initGalleryCarousel();
    initMusicPage();
    initFloatingRSVP();
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
    window.location.href = 'auth';
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

    // Vérifier si l'image a une opacité CSS personnalisée (comme hero-background)
    const hasCustomOpacity = imgElement.classList.contains('hero-background');

    try {
        if (!hasCustomOpacity) {
            imgElement.style.opacity = '0.3';
        }
        imgElement.src = await decryptImage(encryptedPath, token);
        imgElement.onload = () => {
            if (!hasCustomOpacity) {
                imgElement.style.opacity = '1';
                imgElement.style.transition = 'opacity 0.3s ease';
            } else {
                // Pour les images avec opacité CSS, juste une transition douce
                imgElement.style.transition = 'opacity 0.3s ease';
            }
        };
    } catch (error) {
        console.error('[DECRYPT] Erreur chargement image:', error);
        imgElement.alt = 'Image non disponible';
        if (!hasCustomOpacity) {
            imgElement.style.opacity = '1';
        }
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

        // Décrypter et assigner le lien WhatsApp
        if (CONFIG.ENCRYPTED_WHATSAPP_LINK) {
            const whatsappLink = await decryptText(CONFIG.ENCRYPTED_WHATSAPP_LINK, token);
            const whatsappElement = document.getElementById('whatsappLink');
            if (whatsappElement) {
                whatsappElement.href = whatsappLink;
                whatsappElement.onclick = null; // Retirer le blocage du clic
            }
        }
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

// ============================================
// GESTION DE LA PLAYLIST SPOTIFY (PAGE MUSIQUE)
// ============================================

// Configuration de la playlist Spotify
let spotifyConfig = {
    clientId: '',
    clientSecret: '',
    playlistId: CONFIG.SPOTIFY_PLAYLIST_ID,
    appsScriptUrl: CONFIG.SPOTIFY_APPS_SCRIPT_URL,
    accessToken: '',
    tokenExpiry: 0
};

let spotifyPlaylist = [];

/**
 * Décrypte les identifiants Spotify depuis CONFIG
 * Utilise le token d'authentification stocké dans localStorage
 */
async function decryptSpotifyCredentials() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token || token === 'authenticated') {
        console.error('[Spotify] Token d\'authentification manquant');
        return;
    }

    if (!CONFIG.ENCRYPTED_SPOTIFY) {
        console.error('[Spotify] Identifiants encryptés manquants dans CONFIG');
        return;
    }

    try {
        spotifyConfig.clientId = await decryptText(CONFIG.ENCRYPTED_SPOTIFY.clientId, token);
        spotifyConfig.clientSecret = await decryptText(CONFIG.ENCRYPTED_SPOTIFY.clientSecret, token);
        console.log('[Spotify] Identifiants décryptés avec succès');
    } catch (error) {
        console.error('[Spotify] Erreur décryptage identifiants:', error);
    }
}

// Charger la config depuis localStorage
function loadSpotifyConfig() {
    const saved = localStorage.getItem('spotifyPlaylistConfig');
    if (saved) {
        const savedConfig = JSON.parse(saved);
        spotifyConfig = { ...spotifyConfig, ...savedConfig };
    }
}

// Obtenir un token d'accès Spotify
async function getSpotifyAccessToken() {
    if (spotifyConfig.accessToken && Date.now() < spotifyConfig.tokenExpiry) {
        return spotifyConfig.accessToken;
    }

    if (!spotifyConfig.clientId || !spotifyConfig.clientSecret) {
        return null;
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(spotifyConfig.clientId + ':' + spotifyConfig.clientSecret)
            },
            body: 'grant_type=client_credentials'
        });

        const data = await response.json();

        if (data.access_token) {
            spotifyConfig.accessToken = data.access_token;
            spotifyConfig.tokenExpiry = Date.now() + (data.expires_in * 1000);
            return spotifyConfig.accessToken;
        }
    } catch (error) {
        console.error('Erreur authentification Spotify:', error);
        return null;
    }
}

// Charger la playlist depuis Spotify
async function loadSpotifyPlaylist() {
    const token = await getSpotifyAccessToken();
    if (!token) return;

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/playlists/${spotifyConfig.playlistId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Impossible de charger la playlist');
        }

        const data = await response.json();
        spotifyPlaylist = data.tracks.items.map(item => item.track).filter(track => track !== null);

        displaySpotifyPlaylist();
    } catch (error) {
        console.error('Erreur chargement playlist:', error);
    }
}

// Rechercher des chansons
async function searchSpotifyTracks(query) {
    const token = await getSpotifyAccessToken();
    if (!token) return [];

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();
        return data.tracks.items;
    } catch (error) {
        console.error('Erreur recherche Spotify:', error);
        return [];
    }
}

// Afficher les résultats de recherche
function displaySpotifySearchResults(tracks) {
    const resultsContainer = document.getElementById('searchResults');

    if (!tracks || tracks.length === 0) {
        resultsContainer.innerHTML = '<div class="loading">Aucun résultat trouvé</div>';
        resultsContainer.classList.add('active');
        return;
    }

    resultsContainer.innerHTML = tracks.map(track => {
        const isInPlaylist = spotifyPlaylist.find(t => t.id === track.id);
        const btnClass = isInPlaylist ? 'add-btn added' : 'add-btn';
        const btnContent = isInPlaylist ? '✓' : '+';
        const btnDisabled = isInPlaylist ? 'disabled' : '';

        return `
            <div class="search-result-item">
                <img
                    src="${track.album.images[0]?.url || 'https://via.placeholder.com/60'}"
                    alt="${track.name}"
                    class="track-image"
                />
                <div class="track-info">
                    <div class="track-name">${track.name}</div>
                    <div class="track-artist">${track.artists.map(a => a.name).join(', ')}</div>
                    <div class="track-album">${track.album.name}</div>
                </div>
                <button class="${btnClass}" ${btnDisabled} onclick="addToSpotifyPlaylist('${track.id}', '${track.name.replace(/'/g, "\\'")}', this)">${btnContent}</button>
            </div>
        `;
    }).join('');

    resultsContainer.classList.add('active');
}

// Ajouter une chanson via Google Apps Script
async function addToSpotifyPlaylist(trackId, trackName, button) {
    if (!spotifyConfig.appsScriptUrl) {
        return;
    }

    if (spotifyPlaylist.find(t => t.id === trackId)) {
        return;
    }

    // Désactiver le bouton immédiatement
    if (button) {
        button.disabled = true;
        button.classList.add('adding');
        button.innerHTML = '⏳';
    }

    try {
        const formData = new URLSearchParams();
        formData.append('action', 'addTrack');
        formData.append('trackId', trackId);

        const response = await fetch(spotifyConfig.appsScriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const data = await response.json();

        if (data.success) {
            // Marquer le bouton comme ajouté avec animation
            if (button) {
                button.classList.remove('adding');
                button.classList.add('added');
                button.innerHTML = '✓';
            }

            // Animation de fermeture des résultats
            const searchResults = document.getElementById('searchResults');
            searchResults.classList.add('closing');

            // Compter le nombre de morceaux avant rechargement
            const previousCount = spotifyPlaylist.length;

            // Attendre 50ms puis recharger la playlist
            await new Promise(resolve => setTimeout(resolve, 50));
            await loadSpotifyPlaylist();

            // Vérifier que la playlist contient bien un morceau de plus
            let retries = 0;
            const maxRetries = 5;
            while (spotifyPlaylist.length <= previousCount && retries < maxRetries) {
                // Si pas de nouveau morceau, attendre un peu et réessayer
                await new Promise(resolve => setTimeout(resolve, 200));
                await loadSpotifyPlaylist();
                retries++;
            }

            // Attendre la fin de l'animation puis fermer
            await new Promise(resolve => setTimeout(resolve, 350));
            searchResults.classList.remove('active', 'closing');
            document.getElementById('searchInput').value = '';
        } else {
            // En cas d'erreur, remettre le bouton dans son état initial
            if (button) {
                button.disabled = false;
                button.classList.remove('adding');
                button.innerHTML = '+';
            }
        }
    } catch (error) {
        console.error('Erreur ajout chanson:', error);
        // En cas d'erreur, remettre le bouton dans son état initial
        if (button) {
            button.disabled = false;
            button.classList.remove('adding');
            button.innerHTML = '+';
        }
    }
}

// Afficher la playlist
function displaySpotifyPlaylist() {
    const playlistContainer = document.getElementById('playlist');

    if (!playlistContainer) return;

    if (spotifyPlaylist.length === 0) {
        playlistContainer.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p>La playlist est vide</p>
                <p style="font-size: 14px; margin-top: 10px; color: #aaa;">Sois le premier à ajouter une chanson !</p>
            </div>
        `;
        return;
    }

    playlistContainer.innerHTML = [...spotifyPlaylist].reverse().map(track => `
        <li class="playlist-item">
            <img
                src="${track.album.images[0]?.url || 'https://via.placeholder.com/60'}"
                alt="${track.name}"
                class="track-image"
            />
            <div class="track-info">
                <div class="track-name">${track.name}</div>
                <div class="track-artist">${track.artists.map(a => a.name).join(', ')}</div>
                <div class="track-album">${track.album.name}</div>
            </div>
        </li>
    `).join('');
}


// Initialiser la page musique
async function initMusicPage() {
    const searchInput = document.getElementById('searchInput');

    if (!searchInput) return; // Pas sur la page musique

    // Décrypter les identifiants Spotify
    await decryptSpotifyCredentials();

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(searchTimeout);

        if (query.length < 2) {
            document.getElementById('searchResults').classList.remove('active');
            return;
        }

        document.getElementById('searchResults').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        document.getElementById('searchResults').classList.add('active');

        searchTimeout = setTimeout(async () => {
            const tracks = await searchSpotifyTracks(query);
            displaySpotifySearchResults(tracks);
        }, 500);
    });

    // Fermer les résultats en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                searchResults.classList.remove('active');
            }
        }
    });

    // Initialisation
    loadSpotifyConfig();
    loadSpotifyPlaylist();
}

// Exposer les fonctions globalement pour les boutons onclick
window.addToSpotifyPlaylist = addToSpotifyPlaylist;

/**
 * Initialise le carrousel de la galerie de souvenirs
 */
function initGalleryCarousel() {
    const track = document.querySelector('.gallery-carousel-track');
    const prevChevron = document.querySelector('.carousel-chevron-prev');
    const nextChevron = document.querySelector('.carousel-chevron-next');
    const dotsContainer = document.querySelector('.carousel-dots');

    if (!track || !prevChevron || !nextChevron || !dotsContainer) return;

    const items = Array.from(track.querySelectorAll('.gallery-item'));
    const totalItems = items.length;

    // Déterminer le nombre d'items visibles selon la largeur de l'écran
    function getItemsPerView() {
        return window.innerWidth <= 768 ? 1 : 3;
    }

    let currentIndex = 0;
    let itemsPerView = getItemsPerView();

    // Calculer le maxIndex dynamiquement
    function getMaxIndex() {
        return Math.max(0, totalItems - itemsPerView);
    }

    // Créer les dots
    function createDots() {
        dotsContainer.innerHTML = '';
        const maxIndex = getMaxIndex();

        for (let i = 0; i <= maxIndex; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            dot.setAttribute('aria-label', `Aller à la page ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
        updateDots();
    }

    // Mettre à jour l'état des dots
    function updateDots() {
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Déplacer vers un slide spécifique
    function goToSlide(index) {
        const maxIndex = getMaxIndex();
        currentIndex = Math.max(0, Math.min(index, maxIndex));
        updateCarousel();
    }

    // Mettre à jour le carrousel
    function updateCarousel() {
        const itemWidth = items[0].offsetWidth;
        const gap = parseInt(getComputedStyle(track).gap) || 0;
        const offset = -(currentIndex * (itemWidth + gap));

        track.style.transform = `translateX(${offset}px)`;
        updateDots();
    }

    // Navigation suivante avec boucle infinie
    function nextSlide() {
        const maxIndex = getMaxIndex();
        if (currentIndex < maxIndex) {
            currentIndex++;
        } else {
            // Revenir au début
            currentIndex = 0;
        }
        updateCarousel();
    }

    // Navigation précédente avec boucle infinie
    function prevSlide() {
        const maxIndex = getMaxIndex();
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            // Aller à la fin
            currentIndex = maxIndex;
        }
        updateCarousel();
    }

    // Event listeners pour les chevrons
    nextChevron.addEventListener('click', nextSlide);
    prevChevron.addEventListener('click', prevSlide);

    // Support du swipe sur mobile
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe vers la gauche = suivant
                nextSlide();
            } else {
                // Swipe vers la droite = précédent
                prevSlide();
            }
        }
    }

    // Support des touches clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
        }
    });

    // Gérer le resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newItemsPerView = getItemsPerView();
            if (newItemsPerView !== itemsPerView) {
                itemsPerView = newItemsPerView;
                currentIndex = 0;
                createDots();
                updateCarousel();
            } else {
                updateCarousel();
            }
        }, 250);
    });

    // Initialisation
    createDots();
    updateCarousel();
}
