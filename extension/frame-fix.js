// Neutralize frame-busting on web.whatsapp.com inside OmniFlow App
(function() {
  try {
    if (window.self !== window.top) {
      Object.defineProperty(window, 'top', {
        get: function () { return window.self; },
        set: function () { },
        configurable: true
      });
      Object.defineProperty(window, 'parent', {
        get: function () { return window.self; },
        set: function () { },
        configurable: true
      });
    }
  } catch (e) {}
})();
