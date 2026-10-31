/**
 * Latest posts from the Blogger research blog, rendered as cards.
 *
 * Used by index.html and links.html. Any element with [data-blog-feed] is
 * filled with up to data-count post cards (default 4); the closest
 * [data-blog-section] wrapper stays hidden until at least one card renders,
 * so a slow or failed feed simply leaves the section out.
 *
 * Blogger's JSON feed doesn't send CORS headers, so fetch() is blocked from
 * another origin. The feed's JSONP mode (alt=json-in-script) works from any
 * page. Every value from the feed is written with textContent, never as HTML.
 */
(function () {
    const BLOG_URL = 'https://ddenoon.blogspot.com';
    const CALLBACK = '__ddBlogFeed';

    // First match wins, so put more specific keywords first.
    const TITLE_EMOJI = [
        ['prefetch', '⚙️'], ['registry', '🗂️'], ['evtx', '📜'], ['event log', '📜'],
        ['android', '🤖'], ['ios', '📱'], ['corrobora', '🛡️'], ['veritrace', '🔍']
    ];

    function postEmoji(title) {
        const t = (title || '').toLowerCase();
        for (const [word, emoji] of TITLE_EMOJI) if (t.includes(word)) return emoji;
        return '📝';
    }

    // Feed summaries are plain text with HTML entities (&nbsp; etc.).
    function decode(s) {
        return new DOMParser().parseFromString(s || '', 'text/html').body.textContent || '';
    }

    function excerpt(raw, n) {
        let s = decode(raw).replace(/\s+/g, ' ').trim();
        // Drop the image-credit line and bare "Introduction" heading that open some posts.
        s = s.replace(/^Note:\s*Image was created by .*?Version\s*/i, '').replace(/^Introduction\s+/i, '');
        return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:.-]+\S*$/, '') + '…' : s;
    }

    function relTime(date) {
        const days = Math.round((date - new Date()) / 86400000);
        if (!('RelativeTimeFormat' in Intl)) return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        if (Math.abs(days) < 1) return 'today';
        if (Math.abs(days) < 30) return rtf.format(days, 'day');
        if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
        return rtf.format(Math.round(days / 365), 'year');
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function card(entry, isNewest) {
        const link = (entry.link || []).find(l => l.rel === 'alternate');
        if (!link || !/^https:\/\//.test(link.href)) return null;
        const title = (entry.title && entry.title.$t || '').trim();
        const published = new Date(entry.published && entry.published.$t);

        const a = el('a', 'feat');
        a.href = link.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        const top = el('span', 'feat-top');
        const emoji = el('span', 'feat-emoji', postEmoji(title));
        emoji.setAttribute('aria-hidden', 'true');
        top.appendChild(emoji);
        // Only call the newest post "New" while it actually is.
        if (isNewest && Date.now() - published < 30 * 86400000) top.appendChild(el('span', 'feat-badge', 'New'));

        a.appendChild(top);
        a.appendChild(el('span', 'feat-title', title || 'Untitled post'));
        const sub = excerpt(entry.summary && entry.summary.$t, 200);
        if (sub) a.appendChild(el('span', 'feat-sub', sub));
        if (!isNaN(published)) a.appendChild(el('span', 'feat-when', relTime(published)));
        return a;
    }

    const grids = document.querySelectorAll('[data-blog-feed]');
    if (!grids.length) return;
    const max = Math.max(...Array.from(grids, g => parseInt(g.dataset.count, 10) || 4));

    window[CALLBACK] = function (data) {
        const entries = (data && data.feed && data.feed.entry) || [];
        grids.forEach(grid => {
            const count = parseInt(grid.dataset.count, 10) || 4;
            entries.slice(0, count).forEach((entry, i) => {
                const c = card(entry, i === 0);
                if (c) grid.appendChild(c);
            });
            const section = grid.closest('[data-blog-section]');
            if (section && grid.children.length) section.hidden = false;
        });
        delete window[CALLBACK];
    };

    const script = document.createElement('script');
    script.src = `${BLOG_URL}/feeds/posts/summary?alt=json-in-script&max-results=${max}&callback=${CALLBACK}`;
    script.async = true;
    document.body.appendChild(script);
})();
