/* Irving Catholic — shared behaviour for the three form pages.

   Design notes
   ------------
   * Forms submit NATIVELY (a normal multipart POST to Netlify). Nothing here
     hijacks submit with fetch(), because that would break the file uploads.
     All this file does on submit is validate, then stuff generated values
     into hidden inputs that already exist in the static HTML — Netlify only
     records fields it saw in the deployed markup, so no field is ever
     created at runtime.
   * The point of the generated `listing-json` / `updated-json` fields is that
     the notification email arrives with a block that can be pasted straight
     into directory-data.js. That is the whole "least work on submit" idea.
*/
(function (global) {
  'use strict';

  var IC = {};

  /* ------------------------------------------------------------ utilities */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  IC.$ = $; IC.$$ = $$;

  function trim(v) { return (v == null ? '' : String(v)).trim(); }
  IC.trim = trim;

  /* Slug used as the listing `id` and the detail-page URL. Matches the
     convention already in directory-data.js: lowercase, hyphenated, no
     punctuation ("St. Luke Catholic Church" -> "st-luke-catholic-church"). */
  IC.slugify = function (name) {
    return trim(name)
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  };

  /* The data file stores websites without a protocol; listing.html prepends
     https:// itself. Strip whatever the submitter pasted. */
  IC.cleanWebsite = function (v) {
    return trim(v)
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
  };

  IC.cleanHandle = function (v) {
    var h = trim(v)
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/^@+/, '');
    return h ? '@' + h : '';
  };

  IC.cleanFacebook = function (v) {
    return trim(v).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  };

  /* "one per line" textarea -> array, used for mass times. */
  IC.lines = function (v) {
    return trim(v).split(/\r?\n/).map(trim).filter(Boolean);
  };

  IC.isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trim(v)); };

  /* ------------------------------------------------------- Irving geometry */

  /* Standard ray-casting test against the 201-point municipal boundary that
     already ships in directory-data.js — that is how "only Irving" is
     enforced rather than trusting the typed address. */
  IC.insideIrving = function (lat, lng) {
    var poly = global.IRVING_DIRECTORY && global.IRVING_DIRECTORY.irvingBoundary;
    if (!poly || !poly.length) return true; // data missing: don't block a submission
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var yi = poly[i][0], xi = poly[i][1];
      var yj = poly[j][0], xj = poly[j][1];
      var hit = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  };

  /* ZIP codes that fall wholly or partly inside Irving / Las Colinas / Valley
     Ranch. Used as a soft check on the online-only path, where there is no
     pin to test. */
  var IRVING_ZIPS = ['75014', '75015', '75016', '75017', '75038', '75039', '75060',
    '75061', '75062', '75063', '75220', '75261'];
  IC.looksIrving = function (text) {
    var t = trim(text).toLowerCase();
    if (!t) return false;
    if (t.indexOf('irving') !== -1 || t.indexOf('las colinas') !== -1 || t.indexOf('valley ranch') !== -1) return true;
    var zip = t.match(/\b7\d{4}\b/);
    return !!(zip && IRVING_ZIPS.indexOf(zip[0]) !== -1);
  };

  /* --------------------------------------------------------- category meta */

  IC.categories = function () {
    var d = global.IRVING_DIRECTORY;
    return (d && d.categories) || {};
  };

  IC.categoryLabel = function (key) {
    var c = IC.categories()[key];
    return c ? c.label : key;
  };

  /* ------------------------------------------------------- error reporting */

  /* One summary box at the top of the form + per-field outlines. Focus moves
     to the summary so a screen reader announces it. */
  IC.showErrors = function (box, messages) {
    $$('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
    if (!messages.length) {
      box.classList.remove('show');
      box.innerHTML = '';
      return false;
    }
    var html = '<h4>Please fix ' + (messages.length === 1 ? 'this before sending:' : 'these ' + messages.length + ' things before sending:') + '</h4><ul>';
    messages.forEach(function (m) {
      html += '<li>' + m.text.replace(/</g, '&lt;') + '</li>';
      if (m.el) {
        var wrap = m.el.closest ? m.el.closest('.field') : null;
        if (wrap) wrap.classList.add('invalid');
      }
    });
    box.innerHTML = html + '</ul>';
    box.classList.add('show');
    box.setAttribute('tabindex', '-1');
    box.focus({ preventScroll: true });
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (messages[0] && messages[0].el && messages[0].el.focus) {
      setTimeout(function () { try { messages[0].el.focus({ preventScroll: true }); } catch (e) {} }, 400);
    }
    return true;
  };

  /* ------------------------------------------------------- char counters */

  IC.wireCounter = function (input, counter, max) {
    if (!input || !counter) return;
    function paint() {
      var n = input.value.length;
      counter.textContent = n + ' / ' + max;
      counter.classList.toggle('over', n > max);
    }
    input.addEventListener('input', paint);
    paint();
  };

  /* ----------------------------------------------------------- photo slots */

  var MAX_BYTES = 5 * 1024 * 1024; // 5 MB — comfortably under Netlify's per-file cap

  /* Wires one <label class="photo-drop"> containing a file input: click or
     drag to choose, thumbnail preview, × to clear, size guard. */
  IC.wirePhotoSlot = function (drop, onError) {
    var input = $('input[type=file]', drop);
    var clear = $('.clear', drop);
    var fname = $('.fname', drop);
    if (!input) return;

    function setFile(file) {
      if (!file) return reset();
      if (file.size > MAX_BYTES) {
        reset();
        if (onError) {
          onError('“' + file.name + '” is ' + (file.size / 1048576).toFixed(1) +
            ' MB. Please keep each photo under 5 MB, or email the full-size files instead.');
        }
        return;
      }
      drop.classList.add('filled');
      if (fname) fname.textContent = file.name;
      var reader = new FileReader();
      reader.onload = function (e) { drop.style.backgroundImage = 'url("' + e.target.result + '")'; };
      reader.readAsDataURL(file);
    }

    function reset() {
      input.value = '';
      drop.classList.remove('filled');
      drop.style.backgroundImage = '';
      if (fname) fname.textContent = '';
    }

    input.addEventListener('change', function () { setFile(input.files && input.files[0]); });

    if (clear) {
      clear.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); reset();
      });
    }

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
    });
    drop.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      if (!/^image\//.test(files[0].type)) {
        if (onError) onError('“' + files[0].name + '” is not an image file.');
        return;
      }
      try {
        var dt = new DataTransfer();
        dt.items.add(files[0]);
        input.files = dt.files;
      } catch (err) { /* older browser: fall back to the click-to-choose path */ }
      setFile(files[0]);
    });
  };

  IC.wireAllPhotoSlots = function (root, onError) {
    $$('.photo-drop', root).forEach(function (d) { IC.wirePhotoSlot(d, onError); });
  };

  IC.photoSummary = function (root) {
    var named = [];
    $$('.photo-drop', root).forEach(function (d) {
      var input = $('input[type=file]', d);
      if (input && input.files && input.files[0]) {
        named.push((input.getAttribute('data-slot') || input.name) + ': ' + input.files[0].name);
      }
    });
    return named;
  };

  /* --------------------------------------------------------- JSON building */

  /* Build the object in exactly the key order used throughout
     directory-data.js so a pasted block reads like its neighbours. */
  IC.buildListing = function (v) {
    var out = {};
    out.id = v.id;
    out.name = v.name;
    out.category = v.category;
    if (v.online) {
      out.online = true;
    } else {
      out.address = v.address;
      out.lat = v.lat;
      out.lng = v.lng;
    }
    out.blurb = v.blurb;
    out.description = v.description;
    if (v.phone) out.phone = v.phone;
    if (v.email) out.email = v.email;
    if (v.website) out.website = v.website;
    if (v.instagram) out.instagram = v.instagram;
    if (v.facebook) out.facebook = v.facebook;
    if (v.etsy) out.etsy = v.etsy;
    if (!v.online) out.hours = v.hours || '';
    if (v.ordersNote) out.ordersNote = v.ordersNote;
    if (v.mass && v.mass.length) out.mass = v.mass;
    out.heroPhoto = v.heroPhoto || null;
    out.photoCredit = v.photoCredit || null;
    out.gallery = v.gallery || [];
    return out;
  };

  /* Two-space, self-consistent block — paste it between two entries in the
     `resources` array and re-indent to taste. */
  IC.stringify = function (obj) {
    return JSON.stringify(obj, null, 2);
  };

  /* ----------------------------------------------------------- pin picker */

  /* Reusable Leaflet "drop a pin inside Irving" control, shared by
     suggest.html and update.html. Writes into the two hidden lat/lng inputs
     that Netlify already knows about, and refuses to call a point valid
     unless it lands inside the municipal boundary polygon. */
  IC.createPinPicker = function (opts) {
    var mapEl = opts.mapEl, statusEl = opts.statusEl;
    var latInput = opts.latInput, lngInput = opts.lngInput;
    var map = null, marker = null, api = {};

    function paint() {
      if (!statusEl) return;
      if (!latInput.value) {
        statusEl.className = 'map-status idle';
        statusEl.textContent = opts.idleText || 'No pin placed yet';
        return;
      }
      var lat = parseFloat(latInput.value), lng = parseFloat(lngInput.value);
      if (IC.insideIrving(lat, lng)) {
        statusEl.className = 'map-status ok';
        statusEl.textContent = '✓ Inside Irving · ' + lat.toFixed(5) + ', ' + lng.toFixed(5);
      } else {
        statusEl.className = 'map-status bad';
        statusEl.textContent = '✕ That spot is outside the Irving city limits';
      }
    }

    function setPin(lat, lng, recenter) {
      lat = Math.round(lat * 1e6) / 1e6;
      lng = Math.round(lng * 1e6) / 1e6;
      latInput.value = lat;
      lngInput.value = lng;
      if (!marker) {
        var icon = global.L.divIcon({
          html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
                'background:#BF4A3C;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(40,30,15,.4)"></div>',
          className: 'cd-pin', iconSize: [24, 24], iconAnchor: [12, 24]
        });
        marker = global.L.marker([lat, lng], { icon: icon, draggable: true }).addTo(map);
        marker.on('dragend', function () {
          var p = marker.getLatLng();
          setPin(p.lat, p.lng, false);
          if (opts.onChange) opts.onChange();
        });
      } else {
        marker.setLatLng([lat, lng]);
      }
      if (recenter && map) map.setView([lat, lng], Math.max(map.getZoom(), 15));
      paint();
    }

    api.build = function () {
      if (map || !mapEl || !global.L) return;
      var d = global.IRVING_DIRECTORY;
      map = global.L.map(mapEl, { scrollWheelZoom: false, zoomControl: true })
        .setView((d && d.center) || [32.8612, -96.9531], 12);
      global.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap, &copy; CARTO'
      }).addTo(map);

      if (d && d.irvingBoundary && d.irvingBoundary.length) {
        var poly = global.L.polygon(d.irvingBoundary, {
          color: '#bf4a3c', weight: 2, opacity: .85, dashArray: '2 5',
          fillColor: '#bf4a3c', fillOpacity: .05, interactive: false
        }).addTo(map);
        map.fitBounds(poly.getBounds().pad(0.04));
      }
      map.on('click', function (e) {
        setPin(e.latlng.lat, e.latlng.lng, false);
        if (opts.onChange) opts.onChange();
      });
      if (latInput.value && lngInput.value) {
        setPin(parseFloat(latInput.value), parseFloat(lngInput.value), true);
      }
      setTimeout(api.invalidate, 250);
      paint();
    };

    api.invalidate = function () { if (map) { try { map.invalidateSize(); } catch (e) {} } };
    api.setPin = setPin;
    api.paint = paint;
    api.hasPin = function () { return !!(latInput.value && lngInput.value); };
    api.isValid = function () {
      return api.hasPin() && IC.insideIrving(parseFloat(latInput.value), parseFloat(lngInput.value));
    };

    /* Address lookup via OpenStreetMap's Nominatim: one request per button
       press, and every failure path falls back to placing the pin by hand. */
    api.geocode = function (addressInput, btn) {
      var q = trim(addressInput.value);
      if (!q) {
        if (statusEl) {
          statusEl.className = 'map-status bad';
          statusEl.textContent = 'Type the street address first';
        }
        return;
      }
      if (!/irving/i.test(q)) q += ', Irving, TX';
      var restore = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Searching…'; }
      if (statusEl) {
        statusEl.className = 'map-status idle';
        statusEl.textContent = 'Looking that up…';
      }
      global.fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' +
        encodeURIComponent(q), { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('lookup failed')); })
        .then(function (hits) {
          if (!hits || !hits.length) throw new Error('no match');
          setPin(parseFloat(hits[0].lat), parseFloat(hits[0].lon), true);
          if (opts.onChange) opts.onChange();
        })
        .catch(function () {
          if (statusEl) {
            statusEl.className = 'map-status bad';
            statusEl.textContent = 'Couldn’t find it — click the map to place the pin yourself';
          }
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = restore; }
        });
    };

    return api;
  };

  /* ------------------------------------------------------- email fallback */

  /* Builds a mailto: with everything typed so far, for people who would
     rather send it (with photos attached) from their own mail client. */
  IC.mailtoFrom = function (to, subject, lines) {
    var body = lines.filter(function (l) { return l != null; }).join('\n');
    return 'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  };

  /* ---------------------------------------------- wait for directory data */

  /* directory-data.js is a plain script tag, so it is normally already there;
     this just guards against ordering surprises. */
  IC.whenData = function (cb) {
    if (global.IRVING_DIRECTORY) return cb(global.IRVING_DIRECTORY);
    var tries = 0;
    var t = setInterval(function () {
      if (global.IRVING_DIRECTORY) { clearInterval(t); cb(global.IRVING_DIRECTORY); }
      else if (++tries > 60) { clearInterval(t); cb(null); }
    }, 50);
  };

  global.ICForms = IC;
})(window);
