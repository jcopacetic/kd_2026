---
title: "Image Optimization for Faster Websites: WebP vs PNG vs JPG, Tested"
seoTitle: "Image Optimization: WebP vs PNG vs JPG, Tested"
description: "A tested comparison of WebP, PNG and JPG file sizes and compressors, plus the image sizing rules that make websites load faster."
pubDate: 2025-04-01
updatedDate: 2026-10-04
pillar: website
tags: ["Performance Optimization","Images","WebP","Core Web Vitals"]
legacyUrl: "/insights/increase-website-performance-with-this-one-trick/"
gsc12mo: "0 clicks / 4 impr / pos 21.3"
---

The performance problem most site owners can fix themselves is images. Resize every image to the largest size it's actually displayed at, save photos as WebP (or AVIF), compress them, and set their width and height in the page. In my test below, the same image was 35KB as WebP, 117KB as JPG and 563KB as PNG, before any compression. Multiply that across a page and it decides whether the page loads fast.

I built my first client websites in 2011, a pair of portfolio sites for two sister artists, built almost entirely around images. Since then I've worked on hundreds of sites and been hired specifically to speed them up. When someone asks me why their site is slow, the first thing I do is run it through Google PageSpeed Insights and GTmetrix. Two causes come up again and again: the theme, and the images.

## Themes

A theme is a set of templates with code for every design and feature variation it offers, most of which you'll never use. Popular do-everything themes can load thousands of lines of code your pages don't need. I like themes, and recommend them often, but choose lightweight, well-maintained ones and avoid the bloated ones. If you're on HubSpot, I compare a few good ones in [HubSpot Themes, Templates and Modules](/insights/hubspot-website-development-customization/).

The theme is mostly a decision you make once. Images are a decision you make every time you publish, which is why they're the most neglected.

## Images: the size problem

Here's how it usually happens. You have an image you made or downloaded, 2,400 pixels wide. A typical laptop or desktop screen is around 1,920 pixels wide, and an article column is often around 860. You drag the 2,400-pixel file into your CMS and place it in that column anyway.

Now check the file size. If it's several megabytes, the browser downloads all of it, then shrinks it to fit. On a phone connection that's the difference between a page that appears instantly and one that makes people leave. Large images also hurt **Largest Contentful Paint (LCP)**, the Core Web Vitals measure of how quickly the main content appears, which Google uses as a ranking signal.

Every image has a point where shrinking it further makes it look blurry. You'll know you've passed it when you load the page and think, "why is that fuzzy?" The goal is to get each image as close to that point as possible: the hero banner, the background shapes, the icons you downloaded as PNGs, all of them.

## The test: one image, three formats

I took one 1,000×563 image and converted it into WebP, PNG and JPG at the same dimensions with [CloudConvert](https://cloudconvert.com/), without changing quality settings:

| Format | File size | Dimensions |
| --- | --- | --- |
| WebP | 34.8 KB | 1000 × 563 |
| JPG | 117 KB | 1000 × 563 |
| PNG | 563 KB | 1000 × 563 |

Same picture, same size on screen, and the PNG is sixteen times heavier than the WebP. Format alone makes a big difference before any compression.

### WebP

WebP is a modern format designed for the web. Google's own figures: "WebP lossless images are 26% smaller in size compared to PNGs. WebP lossy images are 25-34% smaller than comparable JPEG images at equivalent SSIM quality index," and lossless WebP supports transparency "at a cost of just 22% additional bytes" ([Google](https://developers.google.com/speed/webp)).

All current browsers support it. The friction is in design tools, some of which still need a plugin or a setting to open or export WebP.

Running the WebP version through three compressors:

| Tool | Result |
| --- | --- |
| [EZGif OptiWebP](https://ezgif.com/optiwebp) (60% quality) | 23.2 KB |
| [TinyPNG](https://tinypng.com/) | 26.0 KB |
| [Compress or Die](https://compress-or-die.com/) | 27.6 KB |

EZGif came out ahead, partly because you choose the quality level. Sixty percent is a good starting point for photos; check the result and go up if it looks soft.

### PNG

PNG is lossless and supports transparency, which is why design tools export it so readily. It's the right choice for graphics with sharp edges and few colors, and the wrong one for photos. The same image through PNG compressors:

| Tool | Result |
| --- | --- |
| [TinyPNG](https://tinypng.com/) | 181.5 KB |
| [Compress or Die](https://compress-or-die.com/) | 206.4 KB |
| [CompressPNG](https://compresspng.com/) | 220 KB |
| [EZGif OptiPNG](https://ezgif.com/optipng) | 533.8 KB |

TinyPNG cut it by about two thirds. EZGif barely changed it, so it isn't the best compressor for every format, though it's still my go-to for cropping and resizing.

### JPG

JPG is the long-standing format for photos. It's compact but has no transparency. The JPG version compressed well with every tool:

| Tool | Result |
| --- | --- |
| [EZGif OptiJPEG](https://ezgif.com/optijpeg) | 55.7 KB |
| [JPEG Optimizer](https://jpeg-optimizer.com/) | 56.2 KB |
| [TinyJPG](https://tinyjpg.com/) | 68.8 KB |

Even compressed, the best JPG (55.7 KB) was still about 60% heavier than the WebP before compression (34.8 KB).

## What I'd do with every image

1. **Resize first.** Make the image no wider than the largest space it fills, or twice that for sharp display on high-resolution screens if it matters.
2. **Pick the format by content.** WebP (or AVIF, which is often smaller still) for photos; SVG for logos and icons where you can; PNG only for graphics that need lossless edges.
3. **Compress.** Use one of the tools above, or let your CMS or build process do it automatically.
4. **Set width and height** in the HTML (or let your CMS do it). The browser reserves the space before the image loads, so the page doesn't jump around. That's the **Cumulative Layout Shift** part of Core Web Vitals.
5. **Lazy-load images below the fold** with `loading="lazy"`, and don't lazy-load the main image at the top of the page, which should load first.
6. **Serve the right size per screen** with `srcset`, so phones don't download desktop-sized images. Many CMSs, WordPress among them, generate these sizes for you when you upload; check whether yours does.

PageSpeed Insights flags oversized images, missing dimensions and older formats, so run your pages through it after you publish and fix what it finds.

## In short

You probably can't avoid a theme, but you can choose a lean one. Whatever you build on, a few minutes spent resizing, converting and compressing each image will do more for your page speed than almost anything else you control. If you want the full picture for your site, my [Website & Presence Audit](/audit/website/) covers performance alongside SEO, tracking and lead capture.
