import OpenAI from "openai";

import ffmpegPath from "ffmpeg-static";

import {
  createReadStream,
  existsSync,
} from "node:fs";

import {
  mkdir,
  rm,
  stat,
} from "node:fs/promises";

import path from "node:path";

import { spawn } from "node:child_process";

const MAX_AUDIO_SIZE_BYTES =
  25 * 1024 * 1024;

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

function convertAudioToMp3(
  inputPath: string
): Promise<string> {
  return new Promise(
    async (resolve, reject) => {
      if (!ffmpegPath) {
        reject(
          new Error(
            "ffmpeg nao disponivel"
          )
        );
        return;
      }

      const outputDir =
        path.join(
          path.dirname(inputPath),
          "transcriptions"
        );

      await mkdir(outputDir, {
        recursive: true,
      });

      const outputPath =
        path.join(
          outputDir,
          `${path.parse(inputPath).name}-${Date.now()}.mp3`
        );

      const ffmpeg =
        spawn(ffmpegPath, [
          "-y",
          "-i",
          inputPath,
          "-vn",
          "-acodec",
          "libmp3lame",
          "-ar",
          "16000",
          "-ac",
          "1",
          outputPath,
        ]);

      let errorOutput = "";

      ffmpeg.stderr.on(
        "data",
        (chunk) => {
          errorOutput +=
            chunk.toString();
        }
      );

      ffmpeg.on(
        "error",
        reject
      );

      ffmpeg.on(
        "close",
        (code) => {
          if (code === 0) {
            resolve(outputPath);
            return;
          }

          reject(
            new Error(
              `ffmpeg saiu com codigo ${code}: ${errorOutput}`
            )
          );
        }
      );
    }
  );
}

async function safeRemoveFile(
  filePath: string
) {
  try {
    await rm(filePath, {
      force: true,
    });
  } catch {
    // arquivo temporario, pode ser ignorado
  }
}

async function getTranscriptionFilePath(
  filePath: string
) {
  try {
    return await convertAudioToMp3(
      filePath
    );
  } catch (error) {
    console.warn(
      "Nao foi possivel converter audio para mp3. Tentando transcrever o arquivo original:",
      error instanceof Error
        ? error.message
        : error
    );

    return filePath;
  }
}

export async function transcribeAudioFile(
  filePath: string
) {
  if (
    !process.env.OPENAI_API_KEY
  ) {
    console.warn(
      "OPENAI_API_KEY nao configurada. Audio nao transcrito."
    );
    return null;
  }

  if (
    !existsSync(filePath)
  ) {
    console.warn(
      "Arquivo de audio nao encontrado para transcricao:",
      filePath
    );
    return null;
  }

  const transcriptionFilePath =
    await getTranscriptionFilePath(
      filePath
    );

  const isTemporaryFile =
    transcriptionFilePath !==
    filePath;

  try {
    const fileInfo =
      await stat(
        transcriptionFilePath
      );

    if (
      fileInfo.size >
      MAX_AUDIO_SIZE_BYTES
    ) {
      console.warn(
        "Audio acima do limite de 25 MB para transcricao."
      );
      return null;
    }

    const transcription =
      await openai.audio
        .transcriptions
        .create({
          file:
            createReadStream(
              transcriptionFilePath
            ),

          model:
            process.env
              .OPENAI_TRANSCRIPTION_MODEL ||
            "gpt-4o-mini-transcribe",

          language:
            "pt",

          prompt:
            "Conversa de atendimento da Helo Cosmeticos no WhatsApp. Termos comuns: cosmeticos, progressiva, shampoo, mascara capilar, hidratacao, reconstrucao, kit, produto, frete, pagamento, pix.",

          temperature:
            0,
        });

    const text =
      transcription.text?.trim();

    return text || null;
  } catch (error) {
    console.error(
      "Erro ao transcrever audio:",
      error instanceof Error
        ? error.message
        : error
    );

    return null;
  } finally {
    if (isTemporaryFile) {
      await safeRemoveFile(
        transcriptionFilePath
      );
    }
  }
}
