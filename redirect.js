// Redirection automatique .html → URL propre
// Ce script doit être chargé en PREMIER dans le <head> pour éviter le chargement inutile de ressources

(function() {
    const pathname = window.location.pathname;

    // Rediriger /index.html ou /index vers /
    if (pathname.endsWith('/index.html') || pathname.endsWith('/index')) {
        const basePath = pathname.replace(/\/index(\.html)?$/, '/');
        window.location.replace(
            basePath +
            window.location.search +
            window.location.hash
        );
        return;
    }

    // Rediriger si l'URL se termine par .html
    if (pathname.endsWith('.html')) {
        window.location.replace(
            pathname.replace(/\.html$/, '') +
            window.location.search +
            window.location.hash
        );
    }
})();
