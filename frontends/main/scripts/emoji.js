// https://github.com/UziTech/marked-emoji
function markedEmoji(options) {
    options = {
        ...options,
    };

    if (!options.emojis) {
        throw new Error('Must provide emojis to markedEmoji');
    }

    const emojiNames = Object.keys(options.emojis).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const emojiRegex = new RegExp(`:(${emojiNames}):`);
    const tokenizerRule = new RegExp(`^${emojiRegex.source}`);

    return {
        extensions: [{
            name: 'emoji',
            level: 'inline',
            start(src) { return src.match(emojiRegex)?.index; },
            tokenizer(src, tokens) {
                const match = tokenizerRule.exec(src);
                if (!match) {
                    return;
                }

                const name = match[1];
                let emojiData = options.emojis[name];
                let emoji = emojiData?.emoji;
                let renderer = emojiData?.renderer;
                let unicode = options.renderer ? undefined : options.unicode;

                // Use the renderer if it's provided in the emoji data
                if (typeof emoji !== 'string' && !options.renderer) {
                    if (typeof emojiData?.emoji === 'string') {
                        emoji = emojiData.emoji;
                        unicode = true;
                    } else {
                        // invalid emoji
                        return;
                    }
                }

                return {
                    type: 'emoji',
                    raw: match[0],
                    name,
                    emoji,
                    unicode,
                    renderer
                };
            },
            renderer(token) {
                console.log(token);
                // If a custom renderer is provided for this emoji, use it
                if (token.renderer) {
                    return token.renderer(token);
                }

                // Default rendering
                if (options.renderer) {
                    return options.renderer(token);
                }

                if (token.unicode) {
                    return token.emoji;
                } else {
                    return `<img alt="${token.name}" src="${token.emoji}" class="marked-emoji-img">`;
                }
            },
        }],
    };
}
