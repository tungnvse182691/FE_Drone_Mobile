# Video, SRT and frame pipeline

The AI repository's `src/pipeline/pipeline.py::run_video_analysis_task` accepts video, optional SRT, model path, confidence, duration, sampling FPS, tiling and output directory. `src/ingestion/srt_parser.py::DJISRTParser` parses DJI SRT blocks; `video_extractor.py` associates telemetry with sampled frames. The linear pipeline declares seven stages: segment, detect, filter, deduplicate, measure, inspect and report.

These are repository capabilities (`CURRENT_IMPLEMENTED_AI`), not deployed acceptance. Missing/invalid SRT, timestamp mismatch, unreadable video or absent model must produce an explicit failure or missing-telemetry result; it must not be treated as complete GPS coverage. The Backend must preserve source file IDs, checksums, dataset/route/segment/band scope and manifest/model pins.

The worker API's `ManifestModel` carries `video_intervals`, checksum, SRT URI, time bounds, road section/segment context, band, model config and callback URL. The current worker does not demonstrate downloading private object storage artifacts, validating SRT alignment, or invoking a real model in its background branch. Those are `SOURCE_GAP`/`NOT_VERIFIED_E2E`.

Image frames and bbox timestamps are observation provenance. A road GIS segment/section is a geographic planning entity; a pixel road mask is an image operation. One must not be substituted for the other.
