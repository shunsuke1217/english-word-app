export type Word={
  en_word:string,
  ja_word:string,
  image:string,
}
export type ReturnText={
    translations:[{
        detected_source_language:string,
        text:string
    }]
}

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
