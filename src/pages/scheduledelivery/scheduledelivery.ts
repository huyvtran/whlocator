import { Component } from '@angular/core';
import { LoadingController, ViewController, Platform, ModalController, MenuController, IonicPage, NavController, ToastController, NavParams, Refresher } from 'ionic-angular';
import { ApiProvider } from '../../providers/api/api';
import { AlertController } from 'ionic-angular';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpHeaders } from "@angular/common/http";
import { Storage } from '@ionic/storage';
import moment from 'moment';

@IonicPage()
@Component({
  selector: 'page-scheduledelivery',
  templateUrl: 'scheduledelivery.html',
})
export class ScheduledeliveryPage {

  public calendar = [];
  public slotall = [];
  private token: any;
  public loader: any;
  public userid: any;
  public name: any;
  public role = [];
  public roleid: any;
  public rolecab: any;
  public rolearea: any;
  private width: number;
  private height: number;
  public slot: any;
  public invoiceshow: boolean = false;
  public deliveryorder = [];
  public slotselect = [];
  public dateselect = [];
  public loaderproses: any;
  public showdetail: boolean = false;
  public namecust = ''
  public address = ''
  public address1 = ''
  public kota = ''
  public telp = ''
  public postcode = ''
  public addressfull = ''
  public itemsall = [];
  public showroom = '';
  public receiptno = '';

  constructor(
    public navCtrl: NavController,
    public api: ApiProvider,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public navParams: NavParams,
    public menu: MenuController,
    public modalCtrl: ModalController,
    public platform: Platform,
    public viewCtrl: ViewController,
    public storage: Storage,
    public loadingCtrl: LoadingController
  ) {
    this.loader = this.loadingCtrl.create({
      // cssClass: 'transparent',
      content: 'Loading Content...'
    });
    this.loader.present();
    this.invoiceshow = false;
    this.showdetail = false;
    this.rolecab = this.navParams.get('rolecab')
    platform.ready().then(() => {
      this.width = platform.width();
      this.height = platform.height();
      this.storage.get('name').then((val) => {
        this.name = val;
      });
      this.storage.get('userid').then((val) => {
        this.userid = val;
        this.api.get('table/user_role', { params: { filter: "id_user=" + "'" + this.userid + "'" } })
          .subscribe(val => {
            this.role = val['data']
            this.roleid = this.role[0].id_group
            this.rolecab = this.role[0].id_cab
            this.rolearea = this.role[0].id_area
          })
      });
    });
  }
  ngAfterViewInit() {
  }
  doProfile() {
    this.navCtrl.push('UseraccountPage');
  }
  ionViewCanEnter() {
    this.storage.get('token').then((val) => {
      this.token = val;
      if (this.token != null) {
        return true;
      }
      else {
        return false;
      }
    });
  }
  ionViewDidEnter() {
    this.doGetAllCalendar()
  }
  doGetAllCalendar() {
    this.api.get("table/calendar", { params: { limit: 31, filter: "fulldate >=" + "'" + moment().format('YYYY-MM-DD') + "'", sort: 'week ASC, year ASC, month ASC, date ASC' } })
      .subscribe(val => {
        this.calendar = val['data']
        this.loader.dismiss();
      }, err => {
        this.doGetAllCalendar()
      });
  }
  doGetSlot(date) {
    this.dateselect = date
    this.loader = this.loadingCtrl.create({
      // cssClass: 'transparent',
      content: 'Loading Content...'
    });
    this.loader.present();
    this.slot = date.fulldate
    this.api.get("table/slot_delivery", { params: { limit: 1000, filter: "date_delivery =" + "'" + date.fulldate + "'", sort: 'receipt_no ASC' } })
      .subscribe(val => {
        this.slotall = val['data']
        this.loader.dismiss()
      }, err => {
        this.doGetSlot(date)
      });
  }
  doHideSlot() {
    this.slot = ''
    this.slotall = [];
  }
  doSlot(date) {
    if (this.rolearea == 'INBOUND') {
      this.navCtrl.push('SlotdeliveryPage', {
        calendar: date
      })
    }
  }
  slideChanged() {
    this.doHideSlot()
  }
  doSearchInvoice(slot) {
    this.slotselect = slot
    this.doGetDeliveryOrder()
    this.invoiceshow = true;
  }
  doCloseInvoice() {
    this.invoiceshow = false;
  }
  doGetDeliveryOrder() {
    this.api.get("table/delivery_order_header", { params: { limit: 100, filter: "store_from=" + "'" + this.rolecab + "' AND (delivery_booking= '' OR delivery_booking IS NULL)", sort: 'receipt_date ASC' } })
      .subscribe(val => {
        this.deliveryorder = val['data']
      }, err => {
        this.doGetDeliveryOrder()
      });
  }
  getSearch(ev: any) {
    // set val to the value of the searchbar
    let value = ev.target.value;
    // if the value is an empty string don't filter the items
    if (value && value.trim() != '') {
      this.api.get("table/delivery_order_header", { params: { limit: 10, filter: "store_from=" + "'" + this.rolecab + "' AND receipt_no LIKE" + "'%" + value + "%'  AND (delivery_booking= '' OR delivery_booking IS NULL)", sort: 'receipt_date ASC' } })
        .subscribe(val => {
          let data = val['data']
          this.deliveryorder = data.filter(delivery => {
            return delivery.receipt_no.toLowerCase().indexOf(value.toLowerCase()) > -1;
          })
        });
    }
    else {
      this.deliveryorder = [];
      this.doGetDeliveryOrder()
    }
  }
  doSelectDeliveryOrder(dod) {
    let alert = this.alertCtrl.create({
      title: 'Request Slot',
      message: 'Booking slot pada Hari ' + this.dateselect['day_id'] + ' Tanggal ' + this.dateselect['date'] + '-' + this.dateselect['month_description'] + '-' + this.dateselect['year'] + ' Untuk Invoice ' + dod.receipt_no + ' ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {

          }
        },
        {
          text: 'Submit',
          handler: () => {
            this.loaderproses = this.loadingCtrl.create({
              // cssClass: 'transparent',
              content: 'Proses Booking...'
            });
            this.loaderproses.present().then(() => {
              this.doGetDetailAlamat(dod)
            })
          }
        }
      ]
    });
    alert.present()
  }
  readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function () {
      if (rawFile.readyState === 4) {
        callback(rawFile.responseText);
      }
    }
    rawFile.send(null);
  }
  doGetDetailAlamat(dod) {
    if (dod.type_doc == 'TO') {
      this.api.get("tablenav", { params: { limit: 30, table: "CSB_LIVE$Location", filter: "[Code]=" + "'" + dod.store_no + "'" } })
        .subscribe(val => {
          let detailsales = val['data']
          let name = detailsales[0]['Name']
          let address = detailsales[0]['Address']
          let address1 = detailsales[0]['Address 2']
          let kota = detailsales[0]['City']
          let telp = detailsales[0]['Phone No_']
          let postcode = detailsales[0]['Post Code']
          let addressfull = detailsales[0]['Address'] + " " + detailsales[0]['Address 2'] + " " + detailsales[0]['City']
          let dataurl = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + addressfull + '&key=AIzaSyCyS0sAM18a1JhzYSwZEBkfyE5--qFoN1U'
          var self = this;
          this.readTextFile(dataurl, function (text) {
            var datalatlon = JSON.parse(text);
            let latitude = datalatlon.results[0].geometry.location.lat
            let longitude = datalatlon.results[0].geometry.location.lng
            self.doGetNextNo(dod, name, address, address1, kota, telp, postcode, latitude, longitude)
          });
        }, err => {
          this.doGetDetailAlamat(dod)
        });
    }
    else {
      this.api.get("tablenav", { params: { limit: 30, table: "CSB_LIVE$Sales Header Archive", filter: "[No_]=" + "'" + dod.so_no + "'" } })
        .subscribe(val => {
          let detailsales = val['data']
          let name = detailsales[0]['Ship-to Name']
          let address = detailsales[0]['Ship-to Address']
          let address1 = detailsales[0]['Ship-to Address 2']
          let kota = detailsales[0]['Ship-to City']
          let telp = detailsales[0]['Ship-to Phone No_']
          let postcode = detailsales[0]['Ship-to Post Code']
          let addressfull = detailsales[0]['Ship-to Address'] + " " + detailsales[0]['Ship-to Address 2'] + " " + detailsales[0]['Ship-to City']
          let dataurl = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + addressfull + '&key=AIzaSyCyS0sAM18a1JhzYSwZEBkfyE5--qFoN1U'
          var self = this;
          this.readTextFile(dataurl, function (text) {
            var datalatlon = JSON.parse(text);
            let latitude = datalatlon.results[0].geometry.location.lat
            let longitude = datalatlon.results[0].geometry.location.lng
            self.doGetNextNo(dod, name, address, address1, kota, telp, postcode, latitude, longitude)
          });
        }, err => {
          this.doGetDetailAlamat(dod)
        });
    }
  }
  getNextNo() {
    return this.api.get('nextno/slot_delivery/request_no')
  }
  doGetNextNo(dod, name, address, address1, kota, telp, postcode, latitude, longitude) {
    this.api.get("table/slot_delivery", { params: { limit: 1000, filter: "uuid =" + "'" + this.slotselect['uuid'] + "'", sort: 'receipt_no ASC' } })
      .subscribe(val => {
        let data = val['data']
        if (data[0].request_no == '') {
          this.getNextNo().subscribe(val => {
            let nextno = val['nextno'];
            this.doUpdateSlotDelivery(nextno, dod, name, address, address1, kota, telp, postcode, latitude, longitude)
          }, err => {
            this.doGetNextNo(dod, name, address, address1, kota, telp, postcode, latitude, longitude)
          });
        }
        else {
          let alert = this.alertCtrl.create({
            title: 'Perhatian',
            subTitle: 'Slot sudah terpakai',
            buttons: ['OK']
          });
          alert.present();
          this.doGetCalendarAfterUpdate()
        }
      });
  }
  doUpdateSlotDelivery(nextno, dod, name, address, address1, kota, telp, postcode, latitude, longitude) {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");
    this.api.put("table/slot_delivery",
      {
        "uuid": this.slotselect['uuid'],
        "request_no": nextno,
        "pic_request": this.userid,
        "location_request": dod.store_no,
        "receipt_no": dod.receipt_no,
        "customer_no": dod.customer_code,
        "to_address": address,
        "to_address_1": address1,
        "to_code_post": postcode,
        "to_city": kota,
        "to_lat": latitude,
        "to_lng": longitude,
        "to_name": name,
        "to_telp": telp,
        "to_description": '',
        "datetime": moment().format('YYYY-MM-DD HH:mm')
      },
      { headers })
      .subscribe(
        (val) => {
          this.doUpdateDeliveryOrderHeader(dod, nextno)
        }, err => {
          this.doUpdateSlotDelivery(nextno, dod, name, address, address1, kota, telp, postcode, latitude, longitude)
        });
  }
  doUpdateDeliveryOrderHeader(dod, nextno) {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");
    this.api.put("table/delivery_order_header",
      {
        "uuid": dod.uuid,
        "delivery_date": this.dateselect['fulldate'],
        "delivery_booking": nextno
      },
      { headers })
      .subscribe(
        (val) => {
          this.doGetCalendar()
        }, err => {
          this.doUpdateDeliveryOrderHeader(dod, nextno)
        });
  }
  doGetCalendar() {
    this.api.get("table/calendar", { params: { limit: 10, filter: "fulldate=" + "'" + this.dateselect['fulldate'] + "'" } })
      .subscribe(val => {
        let data = val['data']
        let slotavailable = data[0].slot_available
        this.doUpdateCalendar(slotavailable)
      }, err => {
        this.doGetCalendar()
      });
  }
  doUpdateCalendar(slotavailable) {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");
    this.api.put("table/calendar",
      {
        "fulldate": this.dateselect['fulldate'],
        "slot_available": parseInt(slotavailable) - 1
      },
      { headers })
      .subscribe(
        (val) => {
          this.doGetCalendarAfterUpdate()
        }, err => {
          this.doUpdateCalendar(slotavailable)
        });
  }
  doGetCalendarAfterUpdate() {
    this.api.get("table/calendar", { params: { limit: 31, filter: "fulldate >=" + "'" + moment().format('YYYY-MM-DD') + "'", sort: 'week ASC, year ASC, month ASC, date ASC' } })
      .subscribe(val => {
        this.calendar = val['data']
        this.dateselect = [];
        this.slotselect = [];
        this.loaderproses.dismiss()
        this.doCloseInvoice()
        this.doHideSlot()
      }, err => {
        this.doGetCalendarAfterUpdate()
      });
  }
  doViewDetail(dod) {
    this.doGetInfoCust(dod)
    this.doGetItems(dod)
    this.showdetail = true;
  }
  doViewDetailFromSlot(slot) {
    this.doGetDOD(slot)
    this.doGetItemsFromSlot(slot)
    this.showdetail = true;
  }
  doCloseDetail() {
    this.showdetail = false;
  }
  doGetInfoCust(dod) {
    if (dod.type_doc == 'TO') {
      this.api.get("tablenav", { params: { limit: 30, table: "CSB_LIVE$Location", filter: "[Code]=" + "'" + dod.store_no + "'" } })
        .subscribe(val => {
          let detailsales = val['data']
          this.showroom = dod.store_no
          this.receiptno = dod.receipt_no
          this.namecust = detailsales[0]['Name']
          this.address = detailsales[0]['Address']
          this.address1 = detailsales[0]['Address 2']
          this.kota = detailsales[0]['City']
          this.telp = detailsales[0]['Phone No_']
          this.postcode = detailsales[0]['Post Code']
          this.addressfull = detailsales[0]['Address'] + " " + detailsales[0]['Address 2'] + " " + detailsales[0]['City']
        });
    }
    else {
      this.api.get("tablenav", { params: { limit: 30, table: "CSB_LIVE$Sales Header Archive", filter: "[No_]=" + "'" + dod.so_no + "'" } })
        .subscribe(val => {
          let detailsales = val['data']
          this.showroom = dod.store_no
          this.receiptno = dod.receipt_no
          this.namecust = detailsales[0]['Ship-to Name']
          this.address = detailsales[0]['Ship-to Address']
          this.address1 = detailsales[0]['Ship-to Address 2']
          this.kota = detailsales[0]['Ship-to City']
          this.telp = detailsales[0]['Ship-to Phone No_']
          this.postcode = detailsales[0]['Ship-to Post Code']
          this.addressfull = detailsales[0]['Ship-to Address'] + " " + detailsales[0]['Ship-to Address 2'] + " " + detailsales[0]['Ship-to City']
        });
    }
  }
  doGetItems(dod) {
    this.api.get("table/delivery_order_line", { params: { limit: 100, filter: "receipt_no='" + dod.receipt_no + "'", sort: "part_no" + " ASC " } })
      .subscribe(val => {
        this.itemsall = val['data']
      });
  }
  doGetDOD(slot) {
    this.api.get("table/delivery_order_header", { params: { limit: 100, filter: "receipt_no='" + slot.receipt_no + "'" } })
      .subscribe(val => {
        let data = val['data'][0]
        this.doGetInfoCustFromSlot(data)
      });
  }
  doGetInfoCustFromSlot(data) {
    if (data.type_doc == 'TO') {
      this.api.get("tablenav", { params: { limit: 30, table: "CSB_LIVE$Location", filter: "[Code]=" + "'" + data.store_no + "'" } })
        .subscribe(val => {
          let detailsales = val['data']
          this.showroom = data.store_no
          this.receiptno = data.receipt_no
          this.namecust = detailsales[0]['Name']
          this.address = detailsales[0]['Address']
          this.address1 = detailsales[0]['Address 2']
          this.kota = detailsales[0]['City']
          this.telp = detailsales[0]['Phone No_']
          this.postcode = detailsales[0]['Post Code']
          this.addressfull = detailsales[0]['Address'] + " " + detailsales[0]['Address 2'] + " " + detailsales[0]['City']
        });
    }
    else {
      this.api.get("tablenav", { params: { limit: 30, table: "CSB_LIVE$Sales Header Archive", filter: "[No_]=" + "'" + data.so_no + "'" } })
        .subscribe(val => {
          let detailsales = val['data']
          this.showroom = data.store_no
          this.receiptno = data.receipt_no
          this.namecust = detailsales[0]['Ship-to Name']
          this.address = detailsales[0]['Ship-to Address']
          this.address1 = detailsales[0]['Ship-to Address 2']
          this.kota = detailsales[0]['Ship-to City']
          this.telp = detailsales[0]['Ship-to Phone No_']
          this.postcode = detailsales[0]['Ship-to Post Code']
          this.addressfull = detailsales[0]['Ship-to Address'] + " " + detailsales[0]['Ship-to Address 2'] + " " + detailsales[0]['Ship-to City']
        });
    }
  }
  doGetItemsFromSlot(slot) {
    this.api.get("table/delivery_order_line", { params: { limit: 100, filter: "receipt_no='" + slot.receipt_no + "'", sort: "part_no" + " ASC " } })
      .subscribe(val => {
        this.itemsall = val['data']
      });
  }

}
