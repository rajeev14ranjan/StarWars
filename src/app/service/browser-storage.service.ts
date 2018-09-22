import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpHelperService} from './http-helper.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UAParser } from 'ua-parser-js';


@Injectable()
export class StorageService {
  private userListKey = 'userListKey';
  private highScoreKey = 'highScoreKey';
  private allUsers: Array<UserDetail>;
  public uniquieLogid : string;
  public loggedUser = new UserDetail();
  public loggedUserName: string;
  public loggedUserID: string;
  public logScore = 0;
  public parser = new UAParser();
  public isGuestUser : boolean;
  //public isBrowserOnline = Navigator.onLine;

  constructor(private _router : Router, private _dbcon : HttpHelperService){}

  public getAllUsers(): Observable<Array<UserDetail>> {
    let url = `api/stars.php?a=getUser`;
    return this._dbcon.get(url).pipe(
        map((res:Array<UserDetail>)=>{
            this.allUsers = res;
            return res;
        })
    );
  }

  public getHighScore(){
      let url = `api/stars.php?a=score`;

      return this._dbcon.get(url).pipe(
          map((res:Array<any>)=> {
              if(res.length == 0) return {"fullname":'SYSTEM',"score": 0};
              return res[0];
            })
      );
  }


  public checkForLogin(){
      if(!this.loggedUserName){
        this._router.navigateByUrl('login');
      }
  }

  public isAdmin(): boolean{
    return this.loggedUser.access == 'admin';
  }

  public getFullUserNameValidity(checkUserName: string) {
      let url = './api/stars.php';
      let postData = {'action': 'validate', 'un' : checkUserName};
      return this._dbcon.post(url, postData);
  }

  public saveCredentials(fullName: string, userName: string, passWord: string, isLogin = true) {
      if(fullName && userName && passWord){

        const postData = {'fn': '','un': '','pw': '','action':'createUser'};
        postData.fn =  this.trim(fullName);
        postData.un = this.trim(userName);
        postData.pw = this.hash(this.trim(passWord));

        this._dbcon.post('./api/stars.php',postData)
        .subscribe((res:any)=> {
            if(isLogin){
                    if(res.status){
                        this.loggedUser = new UserDetail();
                        this.loggedUser.username = userName;
                        this.loggedUser.fullname = fullName;
                        this.loggedUser.access = 'user';
                    } else {
                        this.loggedUser = new UserDetail();
                    }
            }else{
                this.getAllUsers();
            }
        })
      }
  }

  public trim(text:string){
      return (text && typeof text == 'string' ? text.trim() : text);
  }

  public checkCredentialValidity(checkUserName: string, checkPassWord: string): Observable<boolean> {
        let url = `./api/stars.php`;
        const postData = {'un': checkUserName,'pw': this.hash(checkPassWord), 'action':'login'};

        return this._dbcon.post(url, postData).pipe(
            map((res : Array<UserDetail>)=>{
            if(res && res.length > 0){
                this.loggedUser = res[0];
                this.loggedUserName = res[0].fullname;
                this.loggedUserID = res[0].username;
                this.isGuestUser = false;
                return true;
            } else {
                this.loggedUserName = '';
                return false;
            }
        }));
  }

  public saveUserLog(){
    let postData= {
        'id': this.loggedUser.userid,
        'sc': this.logScore,
        'ua': this.getOsBrowser(),
        'scr': `${window.innerWidth} x ${window.innerHeight}`,
        'action' : 'insertLog'
      }
      if(this.uniquieLogid){
          postData['logid'] = this.uniquieLogid;
      }
      this._dbcon.post('./api/stars.php', postData).subscribe();
  }

  public getLogforUser(userId : number) : Observable<Array<Logs>>{
      let url = `./api/stars.php?a=getLogs&id=${userId}`;
      return this._dbcon.get(url) as Observable<Array<Logs>>;
  }

  public deleteUser(userId: number, userName : string) {
    let postData= {
        'usr': userName,
        'uid': userId,
        'action' : 'deleteUser'
      }
      return this._dbcon.post('./api/stars.php',postData);

  }

  public hash(passText: string) {
      var a = 1, c = 0, iterator, o;
      if (passText) {
          a = 0;
          for (iterator = passText.length - 1; iterator >= 0; iterator--) {
              o = passText.charCodeAt(iterator);
              a = (a << 6 & 268435455) + o + (o << 14);
              c = a & 266338304;
              a = c !== 0 ? a ^ c >> 21 : a;
          }
      }
      return a.toString(36).toUpperCase();
  }

  public CreateDummyUser(userlenth : number){
    
    let isInValid, fn,un,ps ='', cnt = 10;
      do{
            fn = '';
            for(let i = 0; i < 2*userlenth; i++){
                fn += this.randomLetter(i==0 || i== userlenth) + (i== userlenth-1? ' ':'');
            }
            un = fn.split(' ')[0].substr(0,2) + fn.split(' ')[1].substr(0,2);
            un = un.toLowerCase();
            ps = un;
            cnt--;
            isInValid = this.allUsers.some(user=> user.username == un);
        } while(isInValid && cnt > 0);
        
        if(cnt > 0){
            this.saveCredentials(fn,un,ps,false);
            return true;
        }else{
            return false;
        }
        
        
  }

  public randomLetter(isCaptial = false){
      return String.fromCharCode(Math.floor(Math.random() * 26) + (isCaptial ? 65: 97));
  }

  public getOsBrowser(): string {
    let userAgent = navigator.userAgent;
    return `${this.parser.getBrowser(userAgent).name} on ${this.parser.getOS(userAgent).name}`;
  }

}

export class UserDetail {
  constructor(
      public userid?: number,
      public username?: string,
      public fullname?: string,
      public access?: string,
      public data?: string,
      public authkey?: string
  ) { }
}

export class Logs {
    constructor(
        public userid?: number,
        public fullname?: string,
        public timestamp?: Date,
        public useragent?: string,
        public score?: string,
        public screen?: string
    ) { }
  }
