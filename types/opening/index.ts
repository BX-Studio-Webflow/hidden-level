export interface Opening {
  [key: string]: {
    jobTitle: string;
    openingLink: string;
    cityName: string;
    codeValue: string;
    countryCode: string;
    workerTypeCode: string;
    expireDate: string;
  }[];
}
