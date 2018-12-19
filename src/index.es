#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import mkdirp from 'mkdirp'
import PQueue from 'p-queue'
import yargs from 'yargs'
import logUpdate from 'log-update'
import clc from 'cli-color'
import moment from 'moment'

const frames = ['-', '\\', '|', '/']

// function exec (command, callback) {
//   setTimeout(callback, 2000)
// }

function main ({
  _: [
    input = process.cwd(),
  ],
  output,
  concurrency,
  outputExtname,
  inputExtname,
  ffmpegCommand,
  ffmpegOptions,
  deleteOriginal,
  noColor,
  absolutePath,
}) {
  input = path.normalize(input)
  const files = findFiles(input, {
    filter (file) {
      return new RegExp(`\\.${inputExtname}\$`, 'ig').test(file)
    }
  })
  if (files.length == 0) {
    console.log('No found media files!');
  }
  const list = []
  for (const file of files) {
    const dir = path.dirname(output ? file.replace(input, output) : file)
    const ext = path.extname(file)
    const name = path.basename(file, ext)
    list.push({
      input: file,
      outDir: dir,
      outFile: name + '.' + outputExtname,
    })
  }
  run({
    list,
    concurrency,
    ffmpegCommand,
    ffmpegOptions,
    deleteOriginal,
    noColor,
    absolutePath,
  })
}

function run ({
  list = [],
  concurrency,
  ffmpegCommand,
  ffmpegOptions,
  deleteOriginal,
  noColor,
  absolutePath,
}) {
  const startTime = Date.now()
  const queue = new PQueue({concurrency})
  const log = new Log({
    noColor,
  })
  let successCount = 0
  let failureCount = 0
  const length = list.length
  for (let i=0, {length}=list; i<length; i++) {
    const {
      input,
      outDir,
      outFile
    } = list[i]
    const output = path.join(outDir, outFile)
    const item = {
      index: i,
      msg: `[${i+1}/${length}] ${absolutePath ? output : outFile}`,
    }
    const command = `${ffmpegCommand} ${
      JSON.stringify(output)
    } -i ${
      JSON.stringify(input)
    } ${ffmpegOptions || ''}`

    queue.add(() => new Promise((resolve, reject) => {
      item.startTime = Date.now()
      log.load(item)
      mkdirp.sync(outDir)
      try {
        fs.unlinkSync(output)
      } catch (e) {}
      exec(command, err => {
        item.endTime = Date.now()
        if (err) {
          failureCount++
          queue.clear()
          reject(err)
        } else {
          successCount++
          if (deleteOriginal) {
            fs.unlink(input, resolve)
          } else {
            resolve()
          }
        }
      })
    })).then(() => {
      log.done(item)
    }, err => {
      log.done(item, err)
    })
  }
  queue.onIdle().then(() => {
    log.stop()
    logUpdate.done()
    console.log(`Total Time: ${
      formatTime(Date.now() - startTime)
    }; Success: ${successCount}; Failure: ${failureCount}`)
  })
}

function findFiles (file, opts) {
  const files = []
  const stat = fs.statSync(file)
  if (stat.isFile()) {
    if (opts.filter(file)) {
      files.push(file)
    }
  } else if (stat.isDirectory()) {
    const list = fs.readdirSync(file)
    for (const item of list) {
      files.push(...findFiles(path.join(file, item), opts))
    }
  }
  return files
}

function formatTime(time) {
  return moment.utc(time).format('HH:mm:ss')
}

class Log {
  constructor ({
    noColor,
  }) {
    this.noColor = noColor
    this.list = []

    let i = 0
    this.render = () => {
      const frame = frames[i = ++i % frames.length]
      const currentTime = Date.now()
      logUpdate(this.list.map(item => `[${frame}] [${
        formatTime(currentTime - item.startTime)
      }] ${item.msg}`).join('\n'))
    }

    this.start = () => {
      this.render()
      this.timer = setInterval(this.render, 80)
    }

    this.start()
  }

  load (item) {
    this.list.push(item)
    this.render()
  }

  done (item, error = null) {
    for (let i=0; i<this.list.length; i++) {
      if (this.list[i] === item) {
        this.list.splice(i, 1)
      }
    }

    let msg = `[${error ? '×' : '√'}] [${
      formatTime(item.endTime - item.startTime)
    }] ${item.msg}`
    if (!this.noColor) {
      if (error) {
        msg = clc.redBright(msg + '\n' + error.message)
      } else {
        msg = clc.greenBright(msg)
      }
    }
    logUpdate(msg)
    logUpdate.done()
    this.render()
  }

  stop () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

main(yargs.usage('batch-audio-converter [options] [file|dir|.]')
.options({
  'output': {
    alias: 'o',
    describe: 'Output folder',
    normalize: true,
  },
  'concurrency': {
    alias: 'p',
    describe: 'Concurrency limit',
    type: 'number',
    default: 3,
  },
  'input-extname': {
    alias: 'e',
    describe: 'The extname of the original file',
    default: 'm4a',
  },
  'output-extname': {
    alias: 'E',
    describe: 'The extname of the new file',
    default: 'mp3'
  },
  'ffmpeg-command': {
    alias: 'C',
    describe: 'The path of ffmpeg tool',
    normalize: true,
    default: 'ffmpeg',
  },
  'ffmpeg-options': {
    alias: 'O',
    describe: 'The options of ffmpeg tool',
    type: 'string',
  },
  'delete-original': {
    alias: 'D',
    describe: 'Delete original files',
    type: 'boolean',
    default: false,
  },
  'no-color': {
    alias: 'g',
    describe: 'Do not print colored text',
    type: 'boolean',
    default: false,
  },
  'absolute-path': {
    alias: 'a',
    describe: 'Print absolute path',
    type: 'boolean',
    default: false,
  }
})
.version(false)
.strict(true)
.locale('en')
.argv)
