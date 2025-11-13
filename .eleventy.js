const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const katex = require("katex");
const fs = require("fs");
const path = require("path");

module.exports = async function(eleventyConfig) {
  // Add syntax highlighting
  eleventyConfig.addPlugin(syntaxHighlight);

  // Add citations plugin (ES module, requires dynamic import)
  const { default: citations } = await import("eleventy-plugin-citations");
  eleventyConfig.addPlugin(citations, {
    bibliography: "site/_data/bibliography.bib"
  });

  // Pass through assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("site/css");
  eleventyConfig.addPassthroughCopy("site/images");
  eleventyConfig.addPassthroughCopy({"src/assets/distill-favicon.png": "favicon.png"});
  eleventyConfig.addPassthroughCopy({"src/assets/distill-favicon.svg": "favicon.svg"});

  // Global data: footnotes counter
  let footnoteCounter = 0;
  let footnotes = [];

  // Reset counters on each build
  eleventyConfig.on('beforeBuild', () => {
    footnoteCounter = 0;
    footnotes = [];
  });

  // Math shortcode - inline
  eleventyConfig.addShortcode("math", function(content) {
    try {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: false
      });
    } catch (e) {
      console.error("KaTeX error:", e);
      return content;
    }
  });

  // Math shortcode - block
  eleventyConfig.addPairedShortcode("mathblock", function(content) {
    try {
      return `<div class="math-block">${katex.renderToString(content.trim(), {
        throwOnError: false,
        displayMode: true
      })}</div>`;
    } catch (e) {
      console.error("KaTeX error:", e);
      return `<div class="math-block">${content}</div>`;
    }
  });

  // Code shortcode - inline
  eleventyConfig.addShortcode("code", function(language, content) {
    return `<code class="language-${language}">${content}</code>`;
  });

  // Code shortcode - block
  eleventyConfig.addPairedShortcode("codeblock", function(content, language = "javascript") {
    return `<pre><code class="language-${language}">${content.trim()}</code></pre>`;
  });

  // Footnote shortcode with tooltip
  eleventyConfig.addPairedShortcode("footnote", function(content) {
    footnoteCounter++;
    const id = footnoteCounter;
    footnotes.push({ id, content });

    // Strip HTML tags for tooltip (keep only text content)
    const stripHtml = (html) => {
      return html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    };

    const plainText = stripHtml(content);
    const escapedContent = plainText.replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    return `<sup class="footnote-ref"><a href="#fn${id}" id="fnref${id}" class="tooltip" data-tooltip="${escapedContent}" tabindex="0">[${id}]</a></sup>`;
  });

  // Citation shortcode is now provided by eleventy-plugin-citations
  // It provides {% cite "key" %} and {% bibliography %} shortcodes

  // Filter to get all footnotes
  eleventyConfig.addFilter("getFootnotes", function() {
    return footnotes;
  });

  // Filter to add tooltips to citation links
  eleventyConfig.addFilter("citationsWithTooltips", function(content) {
    // This filter wraps citation reference links with tooltip data
    // Parse bibliography file to get citation details
    const bibPath = path.join(__dirname, "site/_data/bibliography.bib");
    const bibContent = fs.readFileSync(bibPath, "utf-8");

    // Parse BibTeX entries to extract author, year, and title
    const bibEntries = {};
    const entries = bibContent.split(/@\w+\{/).slice(1);

    entries.forEach(entry => {
      const keyMatch = entry.match(/^([^,]+),/);
      if (!keyMatch) return;

      const key = keyMatch[1];
      const authorMatch = entry.match(/author\s*=\s*\{([^}]+)\}/);
      const yearMatch = entry.match(/year\s*=\s*\{?(\d+)\}?/);
      const titleMatch = entry.match(/title\s*=\s*\{([^}]+)\}/);

      // Extract first author's last name and check if multiple authors
      let authorString = "Unknown";
      if (authorMatch) {
        const authors = authorMatch[1];
        const authorList = authors.split(' and ');
        const firstAuthorMatch = authorList[0].match(/^([^,]+)/);

        if (firstAuthorMatch) {
          const firstAuthor = firstAuthorMatch[1].trim();
          authorString = authorList.length > 1 ? `${firstAuthor} et al.` : firstAuthor;
        }
      }

      const year = yearMatch ? yearMatch[1] : "n.d.";
      const title = titleMatch ? titleMatch[1] : "";

      // Create citation: "Author et al. (Year). "Title.""
      bibEntries[key] = `${authorString} (${year}). "${title}."`;
    });

    // Add tooltip to citation reference links
    return content.replace(
      /<a href="#bib-([^"]+)"\s+class="reference"\s+id="([^"]+)">(\d+)<\/a>/g,
      (fullMatch, bibKey, refId, number) => {
        const shortCite = bibEntries[bibKey] || "Citation";
        const escapedCite = shortCite.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        return `<a href="#bib-${bibKey}" class="reference tooltip" id="${refId}" data-tooltip="${escapedCite}" tabindex="0">${number}</a>`;
      }
    );
  });

  // Add a collection for articles
  eleventyConfig.addCollection("articles", function(collectionApi) {
    return collectionApi.getFilteredByGlob("site/articles/**/*.njk");
  });

  return {
    dir: {
      input: "site",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: ["html", "njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
