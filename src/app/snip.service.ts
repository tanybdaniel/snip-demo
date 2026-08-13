import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LinkData {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SnipService {
  private apiUrl = 'http://localhost:3000/api/links';

  constructor(private http: HttpClient) {}

  createLink(url: string): Observable<LinkData> {
    return this.http.post<LinkData>(this.apiUrl, { url });
  }

  getLinks(): Observable<LinkData[]> {
    return this.http.get<LinkData[]>(this.apiUrl);
  }
}
