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

  // Footnote shortcode
  eleventyConfig.addPairedShortcode("footnote", function(content) {
    footnoteCounter++;
    const id = footnoteCounter;
    footnotes.push({ id, content });
    return `<sup class="footnote-ref"><a href="#fn${id}" id="fnref${id}">[${id}]</a></sup>`;
  });

  // Citation shortcode is now provided by eleventy-plugin-citations
  // It provides {% cite "key" %} and {% bibliography %} shortcodes

  // Filter to get all footnotes
  eleventyConfig.addFilter("getFootnotes", function() {
    return footnotes;
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
