
"use server";
// Эта функция-заглушка будет заменена при сборке на реальный объект конфигурации.
const getGlobalConfig = (): {
  masterUrl: string;
  collectionId: string;
  activationUrl: string;
  downloadUrl: string;
  sessionId: string;
  rootToken: string;
} => {
    // ВАЖНО: Этот объект используется только в режиме разработки.
    // В продакшене он будет заменен реальными данными при сборке.
    return __MT_GLOBAL_CONFIG__;
};

export { getGlobalConfig };

// Эта заглушка будет заменена при сборке на реальный объект конфигурации.
const __MT_GLOBAL_CONFIG__ = {"masterUrl":"https://9000-firebase-studio-1764249226936.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev","collectionId":"691e8a2a03f6f91d344fdead","activationUrl":"/api/rt/activate_and_get_logic","downloadUrl":"/api/secure-download/get-logic","sessionId":"3e42621baf9776e7da424ee8a2998821","rootToken":"e35b4834bfcf3353021feaa095be0b398ac8f6e54e4bef8dd530db8d03f03884"};
