// Redirection automatique .html → URL propre
// Ce script doit être chargé en PREMIER dans le <head> pour éviter le chargement inutile de ressources

(function() {
    const pathname = window.location.pathname;

    // Rediriger si l'URL se termine par .html (sauf /index.html)
    if (pathname.endsWith('.html') && !pathname.endsWith('/index.html')) {
        window.location.replace(
            pathname.replace(/\.html$/, '') +
            window.location.search +
            window.location.hash
        );
    }
})();
