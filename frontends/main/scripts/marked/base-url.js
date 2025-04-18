// Based on: https://github.com/markedjs/marked-base-url
export function baseUrl(base) {
    base = base.trim().replace(/\/+$/, '/');
    const reIsAbsolute = /^[\w+]+:\/\//;
    const isBaseAbsolute = reIsAbsolute.test(base);
    const dummyUrl = 'http://__dummy__';
    const dummyBaseUrl = new URL(base, dummyUrl);
    const dummyUrlLength = dummyUrl.length + (base.startsWith('/') ? 0 : 1);

    return {
        walkTokens(token) {
            if (!['link', 'image'].includes(token.type)) {
                return;
            }

            if (reIsAbsolute.test(token.href)) {
                return;
            }

            if (token.href.startsWith('#')) {
                return;
            }

            if (isBaseAbsolute) {
                try {
                    token.href = new URL(token.href, base).href;
                } catch {
                    throw Error("Unhandled error caught");
                }
            } else {
                if (token.href.startsWith('/')) {
                    return;
                }
                try {
                    const temp = new URL(token.href, dummyBaseUrl).href;
                    token.href = temp.slice(dummyUrlLength);
                } catch {
                    throw Error("Unhandled error caught");
                }
            }
        },
    };
}