export type Word={
  id:number,//Sentence型と紐づける
  en_word:string,
  ja_word:string,
  image:string,
  isSentence:boolean
  
}
export type Sentence={
  id:number,//Word型と紐づける
  sentence:string,
  sentenceImage:string,
}
/** POST /api/deepl のリクエスト body */
export type DeeplRequestBody = {
  text: string
}

/** POST /api/deepl の成功レスポンス（OpenAI Structured Outputs と同じ形） */
export type DeeplApiResponse = {
  ja_word: string
}

//生成された画像の返り値のデータ構造
export type CreatedImage={
    "created": number,
  "data": [
    {
      "b64_json": string
    }
  ],
  "usage": {
    "total_tokens": number,
    "input_tokens": number,
    "output_tokens": number,
    "input_tokens_details": {
      "text_tokens": number,
      "image_tokens": number
    }
  }
}
