if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add("dark");
}

// Language toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  const langKo = document.getElementById('lang-ko');
  const langEn = document.getElementById('lang-en');
  let currentLang = localStorage.getItem('language') || 'ko';
  
  // Initialize language
  setLanguage(currentLang);
  
  // Add click event listeners
  if (langKo) {
    langKo.addEventListener('click', function() {
      if (currentLang !== 'ko') {
        currentLang = 'ko';
        setLanguage(currentLang);
        localStorage.setItem('language', currentLang);
      }
    });
  }
  
  if (langEn) {
    langEn.addEventListener('click', function() {
      if (currentLang !== 'en') {
        currentLang = 'en';
        setLanguage(currentLang);
        localStorage.setItem('language', currentLang);
      }
    });
  }
  
  function setLanguage(lang) {
    // Update active state
    if (langKo && langEn) {
      langKo.classList.toggle('active', lang === 'ko');
      langEn.classList.toggle('active', lang === 'en');
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
