export interface ApiModel<T> {
  status: boolean;
  message?: string;
  data?: T;
  meta?: any;
}
