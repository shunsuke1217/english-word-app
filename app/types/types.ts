export type Word={
  en_word:string,
  ja_word:string
}
export type ReturnText={
    translations:[{
        detected_source_language:string,
        text:string
    }]
}
