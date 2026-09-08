type RuntimeEnvironment = {
  VERCEL?: string;
  BHON_CONTAINER?: string;
};

export function shouldListen(environment: RuntimeEnvironment = process.env) {
  return !environment.VERCEL || environment.BHON_CONTAINER === "1";
}
