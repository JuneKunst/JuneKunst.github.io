if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add("dark");
}

// Language toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  const langToggle = document.getElementById('lang-toggle');
  const langText = document.getElementById('lang-text');
  let currentLang = localStorage.getItem('language') || 'ko';
  
  // Initialize language
  setLanguage(currentLang);
  
  if (langToggle) {
    langToggle.addEventListener('click', function() {
      currentLang = currentLang === 'ko' ? 'en' : 'ko';
      setLanguage(currentLang);
      localStorage.setItem('language', currentLang);
    });
  }
  
  function setLanguage(lang) {
    langText.textContent = lang === 'ko' ? 'EN' : 'KO';
    document.documentElement.setAttribute('data-lang', lang);
    
    // Show/hide language specific elements
    document.querySelectorAll('[data-lang-ko]').forEach(el => {
      el.style.display = lang === 'ko' ? 'block' : 'none';
    });
    document.querySelectorAll('[data-lang-en]').forEach(el => {
      el.style.display = lang === 'en' ? 'block' : 'none';
    });
  }
});
