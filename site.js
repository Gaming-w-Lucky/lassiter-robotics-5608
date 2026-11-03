/* Shared behaviour for inner pages (robots, team hub): nav, mobile menu,
   scroll reveals, photo lightbox. The homepage keeps its own inline script
   because it also runs the entrance gate. */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav ---------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  function onScroll(){ nav.classList.toggle('solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  function closeMenu(){
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function(){
    var open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('#mobile a').forEach(function(a){ a.addEventListener('click', closeMenu); });

  /* ---------- reveals ---------- */
  window.revealAll = function(root){
    var els = (root || document).querySelectorAll('.rv:not(.in)');
    if (reduce || !('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, {threshold:.12, rootMargin:'0px 0px -60px 0px'});
    els.forEach(function(el){ io.observe(el); });
  };
  window.revealAll();

  /* ---------- lightbox for [data-full] photos ---------- */
  var box = document.getElementById('lightbox');
  if (box){
    var img = box.querySelector('img'), cap = box.querySelector('figcaption');
    document.addEventListener('click', function(e){
      var t = e.target.closest('[data-full]');
      if (!t) return;
      e.preventDefault();
      img.src = t.getAttribute('data-full');
      img.alt = t.getAttribute('aria-label') || '';
      cap.textContent = t.getAttribute('aria-label') || '';
      box.showModal();
    });
    box.addEventListener('click', function(){ box.close(); });
  }
})();
