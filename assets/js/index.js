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
    langToggle.addEventListener('click', function(e) {
      e.preventDefault();
      currentLang = currentLang === 'ko' ? 'en' : 'ko';
      setLanguage(currentLang);
      localStorage.setItem('language', currentLang);
    });
  }
  
  function setLanguage(lang) {
    if (langText) {
      langText.textContent = lang === 'ko' ? 'EN' : 'KO';
    }
    document.documentElement.setAttribute('data-lang', lang);
    
    // Show/hide language specific elements
    const koElements = document.querySelectorAll('[data-lang-ko]');
    const enElements = document.querySelectorAll('[data-lang-en]');
    
    koElements.forEach(el => {
      if (lang === 'ko') {
        el.style.display = '';
        el.style.removeProperty('display');
      } else {
        el.style.display = 'none';
      }
    });
    
    enElements.forEach(el => {
      if (lang === 'en') {
        el.style.display = '';
        el.style.removeProperty('display');
      } else {
        el.style.display = 'none';
      }
    });
    
    console.log('Language switched to:', lang);
  }
});
