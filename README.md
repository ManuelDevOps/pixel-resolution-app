# Pixel Resolution Lab

An interactive English-language learning app for exploring image resolution and practising with short challenges. No dependencies or account are required.

## Run locally

Requires Node.js 18 or later.

```sh
npm start
```

Open <http://127.0.0.1:3000>. Stop the server with Ctrl+C. To choose a different port, set the `PORT` environment variable before starting.

Run the automated checks with `npm test`.

## Theme

The default **Standard** theme uses Colour Depth's warm pastel gradient, purple headings and active controls, yellow outlines and playful rounded panels across Explore, Challenge and TV Lab. Select **Cyber theme** in the header for the optional dark skin; the button then says **Standard theme** to switch back. Switching themes does not restart the page or change your picture or settings. Your choice lasts for the current browser session when session storage is available; if storage is blocked, the button still works until you reload. No external fonts or theme assets are requested.

## Learning activities

Use **Explore** to compare the included 1280 × 720 landscape to pixelated versions, inspect the pixel count and estimate uncompressed image data. On a fresh load, the landscape starts at its full working-image resolution, with the slider at the maximum. The original 320 × 240 illustrations remain selectable; if the included image cannot load, the Mountain illustration remains usable. Choose a local photo or drag and drop it onto **Drag and drop the image here**. JPEG, PNG and WebP files up to 100 MB are supported. A working image is reduced to at most 1600 pixels along its longest side, preserving its proportions; smaller images are not enlarged. The original file stays unchanged, and photos are processed only in your browser, never uploaded to a server. An invalid or unreadable file shows an error without replacing your selected picture. After a successful load, **Your photo** is selected and the slider starts at the far right, showing the full working-image resolution in both views. Move it left to try lower resolutions (8, 16, 32, 64 and 128 pixels wide when smaller than the working image). Slider labels reflect the available widths; very narrow photos offer only widths below their actual width, never enlarged settings. Choose any illustration directly to return to the samples and their original slider range; your last sample setting stays selected unless you deliberately choose a shared lower resolution while viewing a photo. Switch to **Challenge** for image recognition, detail, pixel maths and choosing an appropriate resolution. Switching modes keeps the current state while the page remains open.

In **TV Lab**, the same included 1280 × 720 landscape loads independently on proportional 32″, 45″ and 70″ virtual screens. Each screen sits inside the supplied TV product image (including its bezel and stand), served only from `/assets/tv-photo.png`. If the TV photo cannot load, the 16:9 previews remain usable against a plain frame. It uses automatic HD simulation without enlarging the source, and adds illustrative blur only when stretched. If the asset cannot load, the interactive example remains available. The included image is served only from `/assets/landscape-720p.png`; user photos remain browser-local and are not synchronized between modes. Upload a JPEG, PNG or WebP photo (up to 100 MB) using the picker or drag-and-drop; it stays in your browser. TV Lab detects the decoded source resolution automatically before making a working copy. A picture is 4K or higher when its longer side is at least 3840 pixels and its shorter side at least 2160 pixels, in either orientation. For these images, it uses the full available working detail without simulated blur; the working copy is capped at 3840 pixels on its longest side. Every smaller image (including Full HD) is automatically fitted within 1280 × 720 without enlargement, and stretching progressively adds illustrative blur. The status shows both source and working dimensions; the original file stays local and unchanged. Each image starts at the same displayed size as on the 32″ TV, with unused screen space around it. Drag the purple resize dot on either larger TV to stretch its image proportionally to fit the screen, or use that TV's labeled slider (also works with a keyboard). The two TVs stretch independently; switching Explore/Challenge keeps their settings. Loading a new photo resets both to the starting size; rejecting a photo leaves them unchanged. **Look closer** compares the same physical area: close-ups match before stretching and show fewer source pixels as each image grows. Close-ups omit illustrative blur. The preview backing resolution adapts to the displayed size and device pixel ratio, up to the available working detail and safe limits; neither stretching nor a high-density screen can recover detail beyond the source, the 3840-pixel working cap or inherent image softness. These are illustrative simulations: physical dimensions, viewing distance, panel resolution, scaling and source quality affect real results.

The source illustrations and working photos contain the detail shown by the higher-resolution previews. Enlarging a low-resolution image alone cannot restore detail that was lost. Storage estimates use uncompressed pixel data and do not include file headers or compression.

## Design reference

The approved [wireframes](docs/pixel-resolution-wireframes.png) are the visual reference. The working task record is kept locally and is not included in the public repository.
