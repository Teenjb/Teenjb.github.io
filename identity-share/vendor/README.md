# Locally bundled decoders

All processing libraries below run from this site and are included in the PWA app shell. They do not upload document data.

- `pdfjs/`: Mozilla PDF.js 6.3.289 (Apache-2.0). Includes the worker, character maps, and standard fonts.
- `heic/`: heic2any 0.0.4 (MIT), used to decode HEIC/HEIF locally where the browser lacks native support.
- `tiff/UTIF.js`: UTIF.js 3.1.0 (MIT), with its `pako` 1.0.11 compression dependency (MIT).

See the adjacent license files for the bundled code. PDF.js standard font and CMap notices are included with their assets.
