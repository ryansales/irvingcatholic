/* Per-page SEO metadata and schema.org structured data.
   Loads in <head> after directory-data.js, before the page renders. It sets the
   title / description / canonical / social tags and injects JSON-LD, so every
   listing gets its own identity in search results and link previews instead of
   sharing the homepage's.

   Add or edit a listing in directory-data.js and this picks it up — nothing here
   needs to change. Run `node tools/generate-sitemap.js` afterwards. */
(function () {
  var SITE = 'https://irving-catholic.net';
  var SITE_NAME = 'Irving Catholic';
  var DEFAULT_IMAGE = SITE + '/images/blessed-virgin.jpg';
  var data = window.IRVING_DIRECTORY;
  if (!data) return;

  // schema.org type per directory category. Church / CatholicChurch and
  // School are recognised Place subtypes; the rest fall back to LocalBusiness
  // or Organization, whichever describes the listing honestly.
  var SCHEMA_TYPE = {
    church: 'CatholicChurch',
    school: 'School',
    religious: 'PlaceOfWorship',
    business: 'LocalBusiness',
    ministry: 'NGO',
    owned: 'LocalBusiness'
  };

  function el(tag, attrs) {
    var node = document.createElement(tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    document.head.appendChild(node);
    return node;
  }

  function meta(nameOrProp, value, isProperty) {
    if (!value) return;
    var key = isProperty ? 'property' : 'name';
    var existing = document.head.querySelector('meta[' + key + '="' + nameOrProp + '"]');
    if (existing) { existing.setAttribute('content', value); return; }
    var attrs = { content: value };
    attrs[key] = nameOrProp;
    el('meta', attrs);
  }

  function setCanonical(href) {
    var link = document.head.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute('href', href);
    else el('link', { rel: 'canonical', href: href });
  }

  function jsonLd(obj) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  function absoluteUrl(website) {
    if (!website) return null;
    return /^https?:\/\//.test(website) ? website : 'https://' + website;
  }

  /* "202 S MacArthur Blvd, Irving, TX 75060" -> PostalAddress */
  function postalAddress(address) {
    if (!address) return null;
    var m = /^(.*),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})$/.exec(address);
    if (!m) return { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'US' };
    return {
      '@type': 'PostalAddress',
      streetAddress: m[1].trim(),
      addressLocality: m[2].trim(),
      addressRegion: m[3],
      postalCode: m[4],
      addressCountry: 'US'
    };
  }

  function listingUrl(id) { return SITE + '/listing.html?id=' + id; }

  function social(title, description, url, image) {
    setCanonical(url);
    meta('description', description);
    meta('og:site_name', SITE_NAME, true);
    meta('og:locale', 'en_US', true);
    meta('og:title', title, true);
    meta('og:description', description, true);
    meta('og:url', url, true);
    meta('og:image', image, true);
    meta('twitter:card', 'summary_large_image');
    meta('twitter:title', title);
    meta('twitter:description', description);
    meta('twitter:image', image);
  }

  var isListing = /listing\.html$/.test(location.pathname);

  /* ---------- homepage ---------- */
  if (!isListing) {
    var homeDesc = document.querySelector('meta[name="description"]');
    homeDesc = homeDesc ? homeDesc.content : '';
    social(document.title, homeDesc, SITE + '/', DEFAULT_IMAGE);

    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: 'Irving Catholic Directory',
      url: SITE + '/',
      description: homeDesc,
      inLanguage: 'en-US',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: SITE + '/?q={search_term_string}' },
        'query-input': 'required name=search_term_string'
      }
    });

    var indexed = data.resources.filter(function (r) { return !r.placeholder; });
    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Catholic churches, schools, ministries and businesses in Irving, Texas',
      numberOfItems: indexed.length,
      itemListElement: indexed.map(function (r, i) {
        return {
          '@type': 'ListItem',
          position: i + 1,
          url: listingUrl(r.id),
          name: r.name
        };
      })
    });
    return;
  }

  /* ---------- listing page ---------- */
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var r = (id && data.resources.filter(function (x) { return x.id === id; })[0]) || null;

  if (!r) {
    // Unknown ?id= renders the first listing as a fallback; that is a soft 404,
    // so keep it out of the index rather than letting it duplicate a real page.
    meta('robots', 'noindex, follow');
    return;
  }

  var catLabel = (data.categories[r.category] || {}).label || 'Listing';
  var title = r.name + ' — ' + catLabel + ' in Irving, TX | ' + SITE_NAME;
  var description = (r.blurb || r.description || '').slice(0, 300);
  var image = r.heroPhoto
    ? (/^https?:\/\//.test(r.heroPhoto) ? r.heroPhoto : SITE + '/' + r.heroPhoto.replace(/^\.?\//, ''))
    : DEFAULT_IMAGE;

  document.title = title;
  social(title, description, listingUrl(r.id), image);
  meta('og:type', r.category === 'church' ? 'place' : 'business.business', true);

  // Placeholder listings stand in for businesses that have not been added yet.
  if (r.placeholder) meta('robots', 'noindex, follow');

  var node = {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[r.category] || 'Organization',
    '@id': listingUrl(r.id) + '#place',
    name: r.name,
    description: r.description || r.blurb,
    url: listingUrl(r.id)
  };

  var site = absoluteUrl(r.website);
  if (site) node.sameAs = [site];
  if (r.instagram) {
    node.sameAs = (node.sameAs || []).concat(
      'https://instagram.com/' + String(r.instagram).replace(/^@/, ''));
  }
  if (r.phone) node.telephone = r.phone;
  if (r.email) node.email = r.email;
  if (r.address) node.address = postalAddress(r.address);
  if (typeof r.lat === 'number' && typeof r.lng === 'number') {
    node.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng };
    node.hasMap = 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(r.name + ' ' + r.address);
  }
  // Deliberately not emitting `openingHours` or Mass times as `Event` nodes:
  // both fields are free text ("Office Mon-Fri 9am-5pm", "Sat Vigil 5:30pm"),
  // and schema.org wants "Mo-Fr 09:00-17:00" / an Event with a real startDate.
  // Publishing unparseable values would earn Search Console errors rather than
  // rich results. Add structured fields to directory-data.js to enable these.
  if (r.heroPhoto) node.image = image;
  jsonLd(node);

  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: catLabel, item: SITE + '/?category=' + r.category },
      { '@type': 'ListItem', position: 3, name: r.name }
    ]
  });
})();
