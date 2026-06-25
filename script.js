document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.querySelector('nav ul');
    if (toggle && menu) {
        toggle.addEventListener('click', function () {
            var isOpen = toggle.classList.toggle('open');
            menu.classList.toggle('open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
            toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
        });
        // Close menu when clicking a nav link (mobile UX)
        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                toggle.classList.remove('open');
                menu.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Abrir menú');
            });
        });
    }

    // Animar elementos al entrar al viewport (.area-card y .fade-item)
    var animTargets = document.querySelectorAll('.area-card, .fade-item');
    if (animTargets.length > 0) {
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            animTargets.forEach(function (el) { observer.observe(el); });
        } else {
            animTargets.forEach(function (el) { el.classList.add('visible'); });
        }
    }
});
