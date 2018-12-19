#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import mkdirp from 'mkdirp'
import PQueue from 'p-queue'
import yargs from 'yargs'
import logUpdate from 'log-update'
import clc from 'cli-color'

const frames = ['-', '\\', '|', '/'];

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
}) {
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
  })
}

function run ({
  list = [],
  concurrency,
  ffmpegCommand,
  ffmpegOptions,
  deleteOriginal,
  noColor,
}) {
  const queue = new PQueue({concurrency})
  const log = new Log({
    noColor,
  })
  const length = list.length
  for (let i=0, {length}=list; i<length; i++) {
    const {
      input,
      outDir,
      outFile
    } = list[i]
    const item = {
      index: i,
      msg: `${i+1}/${length} ${outFile}`,
    }
    const output = path.join(outDir, outFile)
    const command = `${ffmpegCommand} ${
      JSON.stringify(output)
    } -i ${
      JSON.stringify(input)
    } ${ffmpegOptions || ''}`

    queue.add(() => new Promise((resolve, reject) => {
      log.load(item)
      mkdirp.sync(outDir)
      try {
        fs.unlinkSync(output)
      } catch (e) {}
      exec(command, err => {
        if (err) {
          queue.clear()
          reject(err)
        } else if (deleteOriginal) {
          fs.unlink(input, resolve)
        } else {
          resolve()
        }
      })
    })).then(() => {
      log.done(item)
    }, err => {
      log.done(item, err)
    })
  }
  queue.onEmpty().then(() => {
    log.stop()
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

class Log {
  constructor ({
    noColor,
  }) {
    this.completedList = []
    this.progressingList = []

    let i = 0
    this.render  = () => {
      const frame = frames[i = ++i % frames.length]
      const list = this.completedList
        .sort((a,b) => a.index > b.index ? 1 : -1)
        .map(item => {
          let msg = `[${item.error ? '×' : '√'}] ${item.msg}`
          if (!noColor) {
            if (item.error) {
              msg = clc.redBright(msg + '\n' + item.error.message)
            } else {
              msg = clc.greenBright(msg)
            }
          }
          return msg
        })
        .concat(this.progressingList.map(item => `[${frame}] ${item.msg}`))
      logUpdate(list.join('\n'))
    }
    this.timer = setInterval(this.render, 80)
  }

  load (item) {
    this.progressingList.push(item)
    this.render()
  }

  done (item, error = null) {
    for (let i=0; i<this.progressingList.length; i++) {
      if (this.progressingList[i] === item) {
        this.progressingList.splice(i, 1)
      }
    }
    if (error) {
      item.error = error
    }
    this.completedList.push(item)
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
    alias: 'c',
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
    alias: 'b',
    describe: 'The path of ffmpeg tool',
    normalize: true,
    default: 'ffmpeg',
  },
  'ffmpeg-options': {
    alias: 'O',
    describe: 'The options of ffmpeg tool',
  },
  'delete-original': {
    alias: 'd',
    describe: 'Delete original files',
    type: 'boolean',
    default: false,
  },
  'no-color': {
    alias: 'C',
    describe: 'Do not print colored text',
    type: 'boolean',
    default: false,
  }
})
.version(false)
.strict(true)
.argv)
