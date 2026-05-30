(function () {
  if (
    window.location.hostname === "www.techm8australia.com" &&
    window.location.protocol === "http:"
  ) {
    window.location.replace(
      "https://www.techm8australia.com" +
        window.location.pathname +
        window.location.search +
        window.location.hash
    );
  }
})();
