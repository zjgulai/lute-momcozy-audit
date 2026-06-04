# Deployment Notes

`nginx/momcozy-audit.conf` intentionally returns real 404 responses for unknown
paths and every `/data/*` request. Replace the example host before installation.

The GitHub Pages workflow is the automatic public release path. Tencent deployment
uses the same immutable `_site` artifact only after the required SSH secrets are
configured and must run the post-deploy 404 smoke tests.

