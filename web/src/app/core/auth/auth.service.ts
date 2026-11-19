import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { AuthResponse,Role,User } from './auth.models';


/** Tarayıcıda oturumun saklandığı anahtar */
const STORAGE_KEY = 'stok-depo.auth';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Sayfa yenilendiğinde oturumu localStorage'dan geri yükler */
function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<Session | null>(readSession());

  /** Giriş yapan kullanıcı (yoksa null) */
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  /** Devam eden refresh isteği (aynı anda yalnızca bir tane olsun diye) */
  private refreshInFlight: Observable<string> | null = null;

  hasRole(...roles: Role[]): boolean {
    const user = this.user();
    return user !== null && roles.includes(user.role);
  }

  get accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((res) => this.saveSession(res)),
      map((res) => res.user),
    );
  }

  refresh(): Observable<string> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('Oturum yok'));
    }

    this.refreshInFlight ??= this.http
      .post<AuthResponse>('/api/auth/refresh-token', { refreshToken })
      .pipe(
        tap((res) => this.saveSession(res)),
        map((res) => res.accessToken),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay(1),
      );
    return this.refreshInFlight;
  }

  /** Kullanıcı "Çıkış yap" dediğinde */
  logout(): void {
    const refreshToken = this.session()?.refreshToken;
    if (refreshToken) {
      // Refresh token sunucuda iptal edilir. İstek başarısız olsa da yerelde çıkış yapılır.
      this.http.post('/api/auth/logout', { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  /** Refresh token da geçersizse (süresi doldu, iptal edildi): giriş sayfasına dön */
  sessionExpired(): void {
    if (!this.session()) return; // Aynı anda gelen hatalarda bir kez çalışsın
    const returnUrl = this.router.url;
    this.clearSession();
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  private saveSession(res: AuthResponse): void {
    const session: Session = {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
    };
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private clearSession(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}