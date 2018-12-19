batch-audio-converter
---

Batch converting media files, This tool depends on [ffmpeg](http://www.ffmpeg.org).

### Installation


```sh
npm i -g batch-audio-converter
```

### CLI

```
batch-audio-converter [options] [file|dir|.]

Options:
  --help                 Show help                                     [boolean]
  --output, -o           Output folder                                  [string]
  --concurrency, -p      Concurrency limit                 [number] [default: 3]
  --input-extname, -e    The extname of the original file       [default: "m4a"]
  --output-extname, -E   The extname of the new file            [default: "mp3"]
  --ffmpeg-command, -C   The path of ffmpeg tool    [string] [default: "ffmpeg"]
  --ffmpeg-options, -O   The options of ffmpeg tool                     [string]
  --delete-original, -D  Delete original files        [boolean] [default: false]
  --no-color, -g         Do not print colored text    [boolean] [default: false]
  --absolute-path, -a    Print absolute path          [boolean] [default: false]
```

### License

MIT
