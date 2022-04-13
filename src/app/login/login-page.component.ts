import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { StorageService } from '../service/browser-storage.service';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FloatTextComponent } from '../float-text/float-text.component';
import { FeedbackComponent } from '../feedback/feedback.component';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent implements AfterViewInit {
  public isRegMode = false;
  public alertsIds = [];
  public loginForm: FormGroup;
  public signUpModalVisible = false;

  @ViewChild('floater') floater: FloatTextComponent;
  @ViewChild('feedback') feedback: FeedbackComponent;

  constructor(
    private _localStorage: StorageService,
    private _title: Title,
    private _router: Router,
    private fb: FormBuilder
  ) {
    this._title.setTitle('Login Page');
    this._localStorage.autoLoginIfTokenAvailable();
    this.antFormContructor(fb);
  }

  ngAfterViewInit() {
    this.removeLogo();
  }

  removeLogo() {
    let removeBanner = () => {
      let disclaimer = document.querySelector('div.disclaimer');
      if (disclaimer) disclaimer.remove();
      const aElt = document.querySelectorAll('a');
      for (let i = 0; i < aElt.length; i++) {
        if (aElt[i].title.includes('Hosted on free')) {
          aElt[i].remove();
          break;
        }
      }
    };

    setTimeout(removeBanner, 0);
    setTimeout(removeBanner, 50);
    setTimeout(removeBanner, 100);
    setTimeout(removeBanner, 300);
  }

  public login() {
    const fn = this.getFormValue('fullName');
    const un = this.getFormValue('userName');
    const pw = this.getFormValue('password');
    const rem = this.getFormValue('remember');
    if (this.isRegMode) {
      // Registration
      this._localStorage.saveCredentials(fn, un, pw).subscribe(
        (success: boolean) => {
          this.resetForm();
          this.setFormValue('password', '');
          this.setFormValue('userName', un);
          this.loginForm.controls.fullName.setValidators([]);
          this.isRegMode = false;
          this.floater.showText('Please Login with credentials', 'S');
        },
        (error: string) => {
          this.floater.showText('SignUp Failed', 'E');
        }
      );
    } else {
      // Login
      this._localStorage.checkCredentialValidity(un, pw).subscribe(
        (response: boolean) => {
          if (response) {
            this._localStorage.uniquieLogid = this.getUniqueID();
            this._localStorage.saveUserLog();
            rem
              ? this._localStorage.saveAutoLoginToken(un, pw)
              : this._localStorage.deleteAutoLoginToken();
            this._router.navigateByUrl('dashboard');
          } else {
            this.setFormValue('password', '');
            this.floater.showText('Incorrect Username or Password', 'E');
          }
        },
        (error) => {
          this.floater.showText('Server Connection cannot be established', 'E');
        }
      );
    }
  }

  public getUniqueID(): string {
    return Date.now().toString(36).toUpperCase();
  }

  antFormContructor(fb) {
    this.loginForm = fb.group({
      fullName: ['', []],
      userName: [
        '',
        {
          validators: [Validators.required],
          asyncValidators: [this.userNameAsyncValidator],
          updateOn: 'blur',
        },
      ],
      password: ['', [Validators.required]],
      remember: [false, []],
    });
  }

  getFormValue(name) {
    return this.loginForm.controls[name].value;
  }

  setFormValue(name, value) {
    return this.loginForm.controls[name].setValue(value);
  }

  submitForm = ($event: any) => {
    $event.preventDefault();
    if (this.loginForm.valid) {
      this.login();
    } else {
      for (const key in this.loginForm.controls) {
        this.loginForm.controls[key].markAsDirty();
        this.loginForm.controls[key].updateValueAndValidity();
      }
      this.floater.showText('Complete all Fields', 'E');
    }
  };

  resetForm(): void {
    this.loginForm.reset();
    for (const key in this.loginForm.controls) {
      this.loginForm.controls[key].markAsPristine();
      this.loginForm.controls[key].updateValueAndValidity();
    }
  }

  userNameAsyncValidator = (control: FormControl) => {
    const validationError = { error: true, duplicated: true };
    return this._localStorage
      .getFullUserNameValidity(this.getFormValue('userName'))
      .pipe(
        map((res: Array<any>) => {
          if (res && res.length) {
            this.floater.showText(
              this.isRegMode
                ? `This Username is NOT Available`
                : `Welcome ${res[0]['fullname']}`,
              this.isRegMode ? 'E' : 'S'
            );
            return this.isRegMode ? validationError : null;
          } else {
            this.floater.showText(
              this.isRegMode
                ? 'Username Available'
                : 'No User found, Sign-up if new User',
              this.isRegMode ? 'S' : 'E'
            );
            return this.isRegMode ? null : validationError;
          }
        }),
        catchError((error) => {
          this.floater.showText("This site can't be reached", 'E');
          return of(validationError);
        })
      );
  };

  onModeChange() {
    this.isRegMode = !this.isRegMode;
    this.resetForm();
    this.loginForm.controls.fullName.setValidators(
      this.isRegMode ? [Validators.required] : []
    );
  }

  public loginAsGuest(check: boolean) {
    if (check && !this._localStorage.isGuestLoginAllowed()) {
      this.signUpModalVisible = true;
      return;
    }
    this.signUpModalVisible = false;
    this._localStorage.loggedUserID = 'guest';
    this._localStorage.loggedUserName = 'Guest';
    this._localStorage.loggedUser.username = 'guest';
    this._localStorage.loggedUser.fullname = 'Guest';
    this._localStorage.loggedUser.userid = 2;
    this._localStorage.loggedUser.access = 'user';
    this._localStorage.loggedUser.data = 'User logged in as Guest';
    this._localStorage.isGuestUser = true;
    this._localStorage.uniquieLogid = this.getUniqueID();
    this._localStorage.saveUserLog();
    this._router.navigateByUrl('dashboard');
  }
}
