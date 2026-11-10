export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function throwResponseError(response: Response): Promise<never> {
  let message = "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.";
  if (response.status === 400) message = "اطلاعات واردشده را بررسی کنید.";
  if (response.status === 401) message = "اطلاعات ورود درست نیست یا نشست شما پایان یافته است.";
  if (response.status === 403) message = "حساب شما اجازه‌ی انجام این کار را ندارد.";
  if (response.status === 404) message = "مورد درخواستی پیدا نشد.";
  if (response.status === 409) message = "این اطلاعات قبلاً در کلینیک ثبت شده است.";
  if (response.status >= 500) message = "سرویس موقتاً پاسخ‌گو نیست. کمی بعد دوباره تلاش کنید.";
  throw new ApiError(response.status, message);
}

export function networkErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "به سرویس MEGAP دسترسی نداریم. اتصال را بررسی و دوباره تلاش کنید.";
}
