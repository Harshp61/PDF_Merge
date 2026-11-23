# Fold PDF tools

A small, static PDF tool designed for large batches. It can merge PDFs in order or create a smaller, image-based copy. It has no application-level file-count limit: PDFs are selected and processed in the user's browser, not uploaded to a server.

## Run it

Open `index.html` in a modern browser, or serve this folder with any static web server. The merger uses `pdf-lib` 1.17.1 and compression uses PDF.js 3.11.174 from jsDelivr, so an internet connection is needed to load the PDF engines. The font is also loaded from Google Fonts; the page falls back to system sans-serif fonts if the font service is unavailable.

## Privacy and practical limits

The selected PDF contents are read locally with the File API. The site has no server component and does not send PDFs anywhere. The browser does make ordinary requests for the PDF library and font files. You can vendor those assets locally later if you want a fully offline version.

There is no fixed file-count limit in the interface. The practical limit is the available memory and processing capacity of the device and browser. Very large or complex batches can take a while or run out of memory. Password-protected or damaged PDFs may not merge.

## Compression

Compression renders each PDF page to a JPEG image at a selected resolution (110, 144, or 180 DPI), then builds a new PDF from those images. This can reduce image-heavy documents, but it rasterizes all content: selectable text, links, forms, and accessibility structure are not retained. Fine print can become harder to read at lower resolutions. The original is left untouched, and the result reports whether the new file is smaller. PDFs that are already compact may become larger; use the merge tool when you need to preserve searchable text and document features.
