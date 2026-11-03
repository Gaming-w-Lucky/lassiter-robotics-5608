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
  /* [data-gallery] holds a JSON list of {src, cap}; arrows / swipe / keys step through it */
  var box = document.getElementById('lightbox');
  if (box){
    var img = box.querySelector('img'), cap = box.querySelector('figcaption');
    var list = [], at = 0;
    var prev = document.createElement('button'), next = document.createElement('button'), count = document.createElement('span');
    prev.className = 'lb-nav lb-prev'; prev.type = 'button'; prev.setAttribute('aria-label', 'Previous photo'); prev.textContent = '←';
    next.className = 'lb-nav lb-next'; next.type = 'button'; next.setAttribute('aria-label', 'Next photo'); next.textContent = '→';
    count.className = 'lb-count';
    box.append(prev, next, count);
    function show(i){
      at = (i + list.length) % list.length;
      img.src = list[at].src; img.alt = list[at].cap; cap.textContent = list[at].cap;
      var many = list.length > 1;
      prev.hidden = next.hidden = count.hidden = !many;
      count.textContent = (at + 1) + ' / ' + list.length;
    }
    function open(items){ list = items; show(0); box.showModal(); }
    document.addEventListener('click', function(e){
      var g = e.target.closest('[data-gallery]');
      if (g){ e.preventDefault(); open(JSON.parse(g.getAttribute('data-gallery'))); return; }
      var t = e.target.closest('[data-full]');
      if (!t) return;
      e.preventDefault();
      open([{ src: t.getAttribute('data-full'), cap: t.getAttribute('aria-label') || '' }]);
    });
    prev.addEventListener('click', function(e){ e.stopPropagation(); show(at - 1); });
    next.addEventListener('click', function(e){ e.stopPropagation(); show(at + 1); });
    box.addEventListener('click', function(){ box.close(); });
    box.addEventListener('keydown', function(e){
      if (e.key === 'ArrowLeft'){ e.preventDefault(); show(at - 1); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); show(at + 1); }
    });
    var x0 = null;
    box.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, {passive:true});
    box.addEventListener('touchend', function(e){
      if (x0 === null || list.length < 2) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    });
  }
})();
