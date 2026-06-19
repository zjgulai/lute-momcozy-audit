/**
 * collect-360-content.mjs
 *
 * 360 内容层采集脚本（Momcozy 诊断框架扩展）
 *
 * 采集维度：
 *   G5  库存信号（公开可见部分）
 *   G6  评论生态信号（数量/质量/UGC/加载时间）
 *   G7  结账链路业务指标（支付方式/字段数量/运费可见性）
 *   G9  PDP 内容深度（字数/视频/认证/变体/信任信号首屏位置）
 *   G11 SEO 架构信号（分面导航/品类页字数/翻页处理/内链）
 *
 * 与 collect.mjs（性能层）并存，输出到 src/_data/content-sessions/
 * 被动只读：不登录、不下单、不填表单
 *
 * 用法：
 *   AUDIT_TARGET_URL=https://momcozy.com npm run collect:360
 *   AUDIT_TARGET_URL=https://momcozy.com AUDIT_ROUTE_CONFIG=config/collection-routes-360-full.json node scripts/collect-360-content.mjs
 */

import {chromium} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const TARGET_URL = process.env.AUDIT_TARGET_URL;
if (!TARGET_URL) {
  console.error("AUDIT_TARGET_URL is required");
  process.exit(1);
}

const now = new Date();
const DATE = process.env.AUDIT_SESSION_DATE || [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0")
].join("-");

const OUT_DIR = process.env.AUDIT_CONTENT_OUTPUT_DIR || "src/_data/content-sessions";
const ROUTE_CONFIG_PATH = process.env.AUDIT_ROUTE_CONFIG || "config/collection-routes-360-full.json";
const OUT_PATH = path.resolve(OUT_DIR, `${DATE}.json`);

if (fs.existsSync(OUT_PATH)) {
  console.log(`Content session ${DATE} already exists at ${OUT_PATH}, skipping.`);
  process.exit(0);
}

const routeConfig = JSON.parse(fs.readFileSync(ROUTE_CONFIG_PATH, "utf8"));
const BASE_DOMAIN = new URL(TARGET_URL).hostname.split(".").slice(-2).join(".");

// ─────────────────────────────────────────────────────────────
// 判断路由类型
// ─────────────────────────────────────────────────────────────
function routeType(route) {
  const p = route.path;
  if (p.startsWith("/collections")) return "collection";
  if (p.startsWith("/search")) return "search";
  if (p.startsWith("/cart")) return "cart";
  if (p.startsWith("/checkout")) return "checkout";
  if (p.startsWith("/sitemap")) return "sitemap";
  if (p.startsWith("/products") || p.includes("/products")) return "pdp";
  if (p === "/") return "homepage";
  return "other";
}

// ─────────────────────────────────────────────────────────────
// G6: 评论生态信号
// ─────────────────────────────────────────────────────────────
async function collectReviewSignals(page) {
  return page.evaluate(() => {
    const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let reviewCount = null;
    let ratingValue = null;
    let hasAggregateRatingJsonLd = false;

    for (const s of jsonLdScripts) {
      try {
        const d = JSON.parse(s.textContent);
        const items = Array.isArray(d) ? d : [d, ...(d["@graph"] || [])];
        for (const item of items) {
          if ((item["@type"] === "Product" || item["@type"] === "ProductGroup") && item.aggregateRating) {
            reviewCount = item.aggregateRating.reviewCount || item.aggregateRating.ratingCount || null;
            ratingValue = item.aggregateRating.ratingValue || null;
            hasAggregateRatingJsonLd = true;
          }
        }
      } catch {}
    }

    // 评论 widget 检测
    const reviewWidget = document.querySelector(
      '[data-reviews], .reviews-widget, #shopify-product-reviews, ' +
      '.yotpo, .yotpo-widget-instance, .stamped-io, .judge-me-widget, ' +
      '.loox-widget, .okendo-widget, [id*="reviews"], [class*="review-widget"]'
    );
    const reviewWidgetPresent = !!reviewWidget;

    // 是否有图片评论展示
    const hasPhotoReviews = !!(
      document.querySelector('.review-image, .review-photo, [data-review-image], .yotpo-review-image') ||
      document.querySelector('[class*="review"] img')
    );

    // 评论摘要是否首屏可见
    const reviewSummaryEl = document.querySelector(
      '.product__rating, .product-rating, [class*="rating"], .yotpo-stars, .spr-badge'
    );
    const reviewsAboveFold = reviewSummaryEl
      ? reviewSummaryEl.getBoundingClientRect().bottom < window.innerHeight
      : false;

    // 评论数量是否在 PDP 首屏可见
    const reviewCountEl = document.querySelector(
      '[class*="review-count"], .spr-badge-caption, .yotpo-reviews-header'
    );
    const reviewCountAboveFold = reviewCountEl
      ? reviewCountEl.getBoundingClientRect().bottom < window.innerHeight
      : false;

    return {
      reviewCount,
      ratingValue: ratingValue ? parseFloat(ratingValue) : null,
      hasAggregateRatingJsonLd,
      reviewWidgetPresent,
      hasPhotoReviews,
      reviewsAboveFold,
      reviewCountAboveFold
    };
  });
}

// ─────────────────────────────────────────────────────────────
// G9: PDP 内容深度
// ─────────────────────────────────────────────────────────────
async function collectContentDepth(page) {
  return page.evaluate(() => {
    // 产品描述文案字数（去除导航/评论/推荐区域）
    const descEl = document.querySelector(
      '.product__description, .product-description, [class*="product-detail__description"], ' +
      '.rte, [data-product-description], .product__content'
    );
    const descText = descEl ? descEl.innerText : "";
    const wordCount = descText.split(/\s+/).filter(w => w.length > 1).length;

    // 视频内容
    const hasVideo = !!(
      document.querySelector('video') ||
      document.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="youtu.be"]') ||
      document.querySelector('[data-youtube], [data-video]')
    );

    // 尺寸/年龄指南
    const bodyText = document.body.innerText;
    const hasSizingGuide = /size\s?guide|sizing\s+guide|flange\s+(size|guide)|age\s+guide|measurement|fit\s+guide|which\s+size/i.test(bodyText);

    // 安全/认证内容
    const hasSafetyCerts = /bpa[- ]?free|cpsc|fda\s+(cleared|approved|registered)|astm|rohs|phthalate[- ]?free|food[- ]?grade\s+silicone|ce\s+(mark|certified)|ul\s+(listed|certified)/i.test(bodyText);

    // FAQ 数量（JSON-LD FAQPage 或展开的 FAQ 组件）
    const jsonLdFaq = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).reduce((acc, s) => {
      try {
        const d = JSON.parse(s.textContent);
        const items = Array.isArray(d) ? d : [d, ...(d["@graph"] || [])];
        for (const item of items) {
          if (item["@type"] === "FAQPage" && Array.isArray(item.mainEntity)) {
            return acc + item.mainEntity.length;
          }
        }
      } catch {}
      return acc;
    }, 0);
    const domFaqCount = document.querySelectorAll('details > summary, .faq-question, [class*="faq__question"], [class*="accordion__title"]').length;
    const faqCount = Math.max(jsonLdFaq, domFaqCount);

    // 变体信息
    const variantSelectors = document.querySelectorAll(
      'select[name*="option"], .variant-wrapper select, [class*="product-form"] select'
    );
    const variantSwatches = document.querySelectorAll(
      '.swatch, [class*="swatch"], [data-option-value], [class*="variant-swatch"]'
    );
    const variantCount = Math.max(variantSelectors.length, variantSwatches.length > 0 ? variantSwatches.length : 0);

    // 加购按钮首屏可见
    const addToCartBtn = document.querySelector(
      '[name="add"], button[id*="add-to-cart"], button[class*="add-to-cart"], ' +
      '.shopify-payment-button__button--unbranded, #AddToCart, [data-add-to-cart]'
    );
    const ctaAboveFold = addToCartBtn
      ? addToCartBtn.getBoundingClientRect().bottom < window.innerHeight
      : false;

    // 信任信号首屏可见（退货/运费/保修）
    const trustKeywords = /free\s+(return|ship|shipping)|30[- ]day|money[- ]back|warranty|guarantee|\d+[- ]year\s+warranty/i;
    const allVisibleEls = Array.from(document.querySelectorAll('p, span, div, li')).filter(el => {
      const r = el.getBoundingClientRect();
      return r.bottom < window.innerHeight && r.height > 0 && r.width > 0;
    });
    const trustSignalsAboveFold = allVisibleEls.some(el => trustKeywords.test(el.innerText || ""));

    // 社会证明首屏（KOL 提及、媒体提及）
    const hasSocialProof = /trusted\s+by|as\s+seen\s+in|featured\s+in|4\.?\d+m?\+?\s+(moms|customers|families)/i.test(bodyText);

    return {
      wordCount,
      hasVideo,
      hasSizingGuide,
      hasSafetyCerts,
      faqCount,
      variantCount,
      ctaAboveFold,
      trustSignalsAboveFold,
      hasSocialProof
    };
  });
}

// ─────────────────────────────────────────────────────────────
// G7: 结账链路业务信号
// ─────────────────────────────────────────────────────────────
async function collectCheckoutSignals(page, routeTypeStr) {
  return page.evaluate((rType) => {
    // 支付方式检测
    const hasApplePay = !!(
      document.querySelector('.apple-pay-button, [data-method="apple-pay"]') ||
      document.querySelector('.shopify-payment-button__button--apple-pay') ||
      document.querySelector('[aria-label*="Apple Pay"]')
    );
    const hasShopPay = !!(
      document.querySelector('.shopify-payment-button__button--shop-pay, [data-method="shop_pay"]') ||
      document.querySelector('[aria-label*="Shop Pay"]')
    );
    const hasGooglePay = !!(
      document.querySelector('[data-method="google-pay"], .google-pay-button') ||
      document.querySelector('[aria-label*="Google Pay"]')
    );
    const hasKlarna = !!(document.querySelector('[class*="klarna"], [data-klarna]'));

    // 表单字段数量（仅 checkout 页有意义）
    const visibleInputs = Array.from(
      document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])')
    ).filter(el => el.getBoundingClientRect().height > 0);
    const formFieldCount = visibleInputs.length;

    // Guest checkout 可用性
    const guestAvailable = !!(
      document.querySelector('[href*="guest"], [data-continue-as-guest], .guest-checkout') ||
      !document.querySelector('[name="customer[login_name]"], input[type="password"]')
    );

    // 运费早期可见性（结账前显示运费信息）
    const bodyText = document.body.innerText;
    const shippingEarlyVisible = /free\s+(ship|shipping)|standard\s+ship|express\s+ship|\$\d+\.?\d*\s+ship|calculated\s+at\s+checkout/i.test(bodyText);

    // 弃单信号：是否有价格展示
    const priceEls = document.querySelectorAll('[class*="price"], [data-price]');
    const priceVisible = priceEls.length > 0;

    // 购物车商品数量
    const cartItems = document.querySelectorAll('[class*="cart-item"], [class*="cart__item"], [data-cart-item]');

    return {
      hasApplePay,
      hasShopPay,
      hasGooglePay,
      hasKlarna,
      formFieldCount,
      guestCheckoutAvailable: guestAvailable,
      shippingCostEarlyVisible: shippingEarlyVisible,
      priceVisible,
      cartItemCount: cartItems.length,
      routeType: rType
    };
  }, routeTypeStr);
}

// ─────────────────────────────────────────────────────────────
// G11: SEO 架构信号
// ─────────────────────────────────────────────────────────────
async function collectSeoArchitecture(page) {
  return page.evaluate(() => {
    // Canonical
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonicalEl ? canonicalEl.href : null;
    const currentUrl = window.location.href.split("?")[0].replace(/\/$/, "");
    const canonicalIsSelf = canonicalUrl
      ? canonicalUrl.replace(/\/$/, "").split("?")[0] === currentUrl
      : null;

    // Robots meta
    const robotsMeta = document.querySelector('meta[name="robots"]')?.content || null;
    const isNoindexed = robotsMeta
      ? robotsMeta.includes("noindex") || robotsMeta.includes("none")
      : false;

    // 品类页正文字数
    const mainContent = document.querySelector(
      '.collection__description, .category-description, .collection-description, ' +
      '[class*="collection__content"] p, main p'
    );
    const categoryPageWordCount = mainContent
      ? mainContent.innerText.split(/\s+/).filter(w => w.length > 1).length
      : 0;

    // 分面导航 URL 检测
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    const facetedLinks = allLinks.filter(a => {
      const href = a.href || "";
      return href.includes("?") && /sort_by|filter\.p\.|filter=|color=|size=|type=|brand=/i.test(href);
    });
    const hasFacetedNavUrls = facetedLinks.length > 0;
    const facetedNavUrlCount = facetedLinks.length;

    // 分页链接
    const paginationLinks = document.querySelectorAll(
      'a[href*="page="], .pagination a, [class*="pagination"] a, [aria-label*="Next page"], [aria-label*="Page"]'
    );
    const paginationPresent = paginationLinks.length > 0;

    // 内链数量（指向 /products/ 或 /collections/ 的内链）
    const internalProductLinks = allLinks.filter(a => {
      const href = a.href || "";
      return href.includes(window.location.hostname) && (href.includes("/products/") || href.includes("/collections/"));
    });

    // Schema breadcrumb
    const hasBreadcrumbSchema = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some(s => {
      try {
        const d = JSON.parse(s.textContent);
        const items = Array.isArray(d) ? d : [d, ...(d["@graph"] || [])];
        return items.some(item => item["@type"] === "BreadcrumbList");
      } catch { return false; }
    });

    // 产品数量（品类页）
    const productCards = document.querySelectorAll(
      '[class*="product-card"], [class*="product-item"], [class*="grid-item"] a[href*="/products/"]'
    );

    return {
      canonicalUrl,
      canonicalIsSelf,
      isNoindexed,
      categoryPageWordCount,
      hasFacetedNavUrls,
      facetedNavUrlCount,
      paginationPresent,
      internalLinksCount: internalProductLinks.length,
      hasBreadcrumbSchema,
      productCount: productCards.length
    };
  });
}

// ─────────────────────────────────────────────────────────────
// G5: 库存信号（公开可见部分）
// ─────────────────────────────────────────────────────────────
async function collectInventorySignals(page) {
  return page.evaluate(() => {
    const bodyText = document.body.innerText;

    // 库存徽章
    const stockBadgeEl = document.querySelector(
      '[class*="stock"], [class*="inventory"], [data-inventory], ' +
      '[class*="availability"], [class*="badge"][class*="stock"]'
    );
    const stockBadgeVisible = !!stockBadgeEl;
    const stockText = stockBadgeEl ? stockBadgeEl.innerText.trim().slice(0, 80) : null;

    // 缺货/延迟发货
    const outOfStock = /out\s+of\s+stock|sold\s+out|unavailable/i.test(bodyText);
    const backorderPresent = /backorder|pre[- ]?order|ships?\s+in\s+\d+|currently\s+unavailable/i.test(bodyText);
    const specificDate = /ships?\s+by\s+\w+\s+\d{1,2}|available\s+\w+\s+\d{1,2},?\s*\d{4}|estimated\s+\w+\s+\d{1,2}/i.test(bodyText);

    // 库存数量是否暴露
    const inventoryExposed = /only\s+\d+\s+(left|remaining|in\s+stock)|^\d+\s+left$/i.test(bodyText);

    // 到货通知
    const hasBackInStockNotify = !!(
      document.querySelector('[class*="back-in-stock"], [data-back-in-stock], [href*="back_in_stock"]') ||
      /notify\s+me|get\s+notified|email\s+me/i.test(bodyText)
    );

    return {
      stockBadgeVisible,
      stockText,
      outOfStock,
      backorderPresent,
      backorderMessageSpecific: specificDate,
      inventoryCountExposed: inventoryExposed,
      hasBackInStockNotify
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 站内搜索信号
// ─────────────────────────────────────────────────────────────
async function collectSearchSignals(page, query) {
  return page.evaluate((q) => {
    const resultEls = document.querySelectorAll(
      '[class*="search-result"], [class*="product-item"], ' +
      '[class*="grid-product"], [data-product-id]'
    );
    const resultCount = resultEls.length;
    const bodyText = document.body.innerText;
    const zeroResults = /no\s+results|0\s+results|nothing\s+found|your\s+search.*no/i.test(bodyText);
    const hasFilters = !!(document.querySelector('[class*="filter"], [class*="sort"], [data-filter]'));

    return {
      query: q,
      resultCount,
      zeroResults,
      hasFilters
    };
  }, query);
}

// ─────────────────────────────────────────────────────────────
// 主采集逻辑
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`[360-content] Starting collection for ${TARGET_URL}`);
  console.log(`[360-content] Route config: ${ROUTE_CONFIG_PATH}`);
  console.log(`[360-content] Output: ${OUT_PATH}`);

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    viewport: {width: 1440, height: 900},
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  const session = {
    sessionId: `content-session-${DATE}`,
    observedAt: DATE,
    methodologyVersion: routeConfig.methodologyVersion,
    targetUrl: TARGET_URL,
    collectedBy: "collect-360-content.mjs Playwright automated observation",
    routeConfig: ROUTE_CONFIG_PATH,
    routes: []
  };

  for (const route of routeConfig.routes) {
    const rType = routeType(route);
    const url = new URL(route.path, TARGET_URL).toString();
    console.log(`[360-content] → ${route.id} (${rType}) ...`);

    const routeResult = {
      routeId: route.id,
      routeLabel: route.label,
      routePath: route.path,
      routeType: rType,
      collectedAt: new Date().toISOString(),
      ...(route.segment ? {segment: route.segment} : {})
    };

    try {
      const response = await page.goto(url, {waitUntil: "domcontentloaded", timeout: 30000});
      routeResult.httpStatus = response ? response.status() : null;

      if (!response || response.status() >= 400) {
        routeResult.error = `HTTP ${response?.status()}`;
        console.warn(`[360-content]   WARN: HTTP ${response?.status()} for ${route.id}`);
        session.routes.push(routeResult);
        continue;
      }

      await page.waitForTimeout(2000);

      // G11: SEO 架构（所有路由都采集）
      routeResult.seoArchitecture = await collectSeoArchitecture(page);

      // G6/G9/G5: PDP 特有
      if (rType === "pdp" || rType === "homepage") {
        routeResult.reviewSignals = await collectReviewSignals(page);
        if (rType === "pdp") {
          routeResult.contentDepth = await collectContentDepth(page);
          routeResult.inventorySignals = await collectInventorySignals(page);
        }
      }

      // G7: 购物车/结账
      if (rType === "cart" || rType === "checkout") {
        routeResult.checkoutSignals = await collectCheckoutSignals(page, rType);
      }

      // 站内搜索信号
      if (rType === "search") {
        const queryMatch = route.path.match(/q=([^&]+)/);
        const query = queryMatch ? decodeURIComponent(queryMatch[1].replace(/\+/g, " ")) : "";
        routeResult.searchSignals = await collectSearchSignals(page, query);
      }

      // KOL UTM 落地页 — 与对应 PDP 同维度采集
      if (route.segment?.sourceType === "social-affiliate" && rType === "pdp") {
        routeResult.reviewSignals = routeResult.reviewSignals || await collectReviewSignals(page);
        routeResult.contentDepth = routeResult.contentDepth || await collectContentDepth(page);
        routeResult.inventorySignals = routeResult.inventorySignals || await collectInventorySignals(page);
      }

      console.log(`[360-content]   done — wordCount=${routeResult.contentDepth?.wordCount ?? "N/A"}, reviewCount=${routeResult.reviewSignals?.reviewCount ?? "N/A"}, facetedNav=${routeResult.seoArchitecture?.hasFacetedNavUrls ?? "N/A"}`);

    } catch (err) {
      routeResult.error = err.message;
      console.error(`[360-content]   ERROR: ${err.message}`);
    }

    session.routes.push(routeResult);
  }

  await browser.close();

  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(OUT_PATH, JSON.stringify(session, null, 2) + "\n");
  console.log(`\n[360-content] ✓ Session written: ${OUT_PATH}`);
  console.log(`[360-content] ✓ Routes collected: ${session.routes.length}`);
  console.log(`[360-content] ✓ Routes with errors: ${session.routes.filter(r => r.error).length}`);

  // 打印摘要
  for (const r of session.routes) {
    if (r.contentDepth || r.reviewSignals || r.checkoutSignals || r.seoArchitecture) {
      const summary = [
        r.contentDepth ? `words=${r.contentDepth.wordCount}` : null,
        r.reviewSignals ? `reviews=${r.reviewSignals.reviewCount ?? "N/A"}` : null,
        r.checkoutSignals ? `shopPay=${r.checkoutSignals.hasShopPay}` : null,
        r.seoArchitecture ? `facetedNav=${r.seoArchitecture.hasFacetedNavUrls}` : null
      ].filter(Boolean).join(", ");
      console.log(`  ${r.routeId}: ${summary}`);
    }
  }
}

main().catch(err => {
  console.error("[360-content] Fatal:", err);
  process.exit(1);
});
