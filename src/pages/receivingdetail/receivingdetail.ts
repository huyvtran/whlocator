import { Component } from '@angular/core';
import { ModalController, MenuController, IonicPage, NavController, ToastController, NavParams, Refresher, ViewController } from 'ionic-angular';
import { ApiProvider } from '../../providers/api/api';
import { AlertController } from 'ionic-angular';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { UUID } from 'angular2-uuid';
import { BarcodeScanner, BarcodeScannerOptions } from "@ionic-native/barcode-scanner";
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import moment from 'moment';
import { Storage } from '@ionic/storage';

declare var window;
declare var Honeywell;

@IonicPage()
@Component({
  selector: 'page-receivingdetail',
  templateUrl: 'receivingdetail.html',
})
export class ReceivingdetailPage {
  myFormModal: FormGroup;
  private receiving = [];
  private receiving_post = [];
  private resultbarcode = [];
  private itemdata = [];
  private receivingchecked = [];
  private location_master = [];
  private division = [];
  private purchasingorder = [];
  data = {};
  option: BarcodeScannerOptions;
  searchrcv: any;
  searchloc: any;
  items = [];
  halaman = 0;
  totaldata: any;
  totaldata_post: any;
  totalresultbarcode: any;
  totaldatachecked: any;
  public toggled: boolean = false;
  public barcode: boolean = false;
  docno = '';
  orderno = '';
  batchno = '';
  locationcode = '';
  expectedreceiptdate = '';
  poid = '';
  qty = '1';
  checked = '';
  divisioncode = '';
  setdiv = '';
  selisihqty: any;
  divdesc = '';
  receivingno = '';
  detailrcv: string = "detailreceiving";
  private uuid = '';
  private nextno = '';
  private nextnostaging = '';
  private nextnostockbalance = '';
  public scannedText: string;
  public buttonText: string;
  public loading: boolean;
  private eventId: number;
  public eventTitle: string;
  private barcodedata: any;
  private token: any;
  public rolecab = '';

  constructor(
    public navCtrl: NavController,
    public api: ApiProvider,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public navParams: NavParams,
    public menu: MenuController,
    public modalCtrl: ModalController,
    public viewCtrl: ViewController,
    private barcodeScanner: BarcodeScanner,
    public storage: Storage,
    private http: HttpClient
  ) {
    this.myFormModal = formBuilder.group({
      location: ['', Validators.compose([Validators.required])],
    })
    this.getRCV();
    this.toggled = false;
    this.barcode = false;
    this.detailrcv = "detailreceiving";
    this.poid = navParams.get('poid');
    this.orderno = navParams.get('orderno');
    this.batchno = navParams.get('batchno');
    this.locationcode = navParams.get('locationcode');
    this.rolecab = navParams.get('rolecab');
    this.expectedreceiptdate = navParams.get('expectedreceiptdate');
    this.getRCVChecked();
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
  getRCVChecked() {
    return new Promise(resolve => {
      this.api.get("table/receiving", { params: { filter: 'order_no=' + "'" + this.orderno + "'" + ' AND ' + "status= 'CHECKED'" } }).subscribe(val => {
        this.receivingchecked = val['data'];
        this.totaldatachecked = val['count'];
        if (this.receivingchecked.length) {
          this.checked = this.receivingchecked[0].item_no
          this.selisihqty = this.receivingchecked[0].qty - this.receivingchecked[0].qty_receiving
        }
        resolve();
      })
    });
  }
  getRCV() {
    return new Promise(resolve => {
      this.api.get("table/receiving", { params: { filter: 'order_no=' + "'" + this.orderno + "'" + ' AND ' + "status= 'OPEN'" } }).subscribe(val => {
        this.receiving = val['data'];
        this.totaldata = val['count'];
        resolve();
      })
    });
  }
  getRCVDetail() {
    return new Promise(resolve => {
      let offset = 30 * this.halaman
      if (this.halaman == -1) {
        resolve();
      }
      else {
        this.halaman++;
        this.api.get('table/receiving', { params: { limit: 30, offset: offset, filter: 'order_no=' + "'" + this.orderno + "'" + ' AND ' + "status= 'OPEN'" } })
          .subscribe(val => {
            let data = val['data'];
            for (let i = 0; i < data.length; i++) {
              this.receiving.push(data[i]);
              this.totaldata = val['count'];
              this.searchrcv = this.receiving;
            }
            if (data.length == 0) {
              this.halaman = -1
            }
            resolve();
          });
      }
    })

  }
  getSearchRCV(ev: any) {
    // set val to the value of the searchbar
    let val = ev.target.value;

    // if the value is an empty string don't filter the items
    if (val && val.trim() != '') {
      this.receiving = this.searchrcv.filter(detailrcv => {
        return detailrcv.item_no.toLowerCase().indexOf(val.toLowerCase()) > -1;
      })
    } else {
      this.receiving = this.searchrcv;
    }
  }
  menuShow() {
    this.menu.enable(true);
    this.menu.swipeEnable(true);
  };

  doInfinite(infiniteScroll) {
    this.getRCVDetail().then(response => {
      infiniteScroll.complete();

    })
  }
  toggleSearch() {
    this.toggled = this.toggled ? false : true;
  }

  doRefresh(refresher) {
    this.api.get("table/receiving", { params: { limit: 30, filter: 'order_no=' + "'" + this.orderno + "'" + ' AND ' + "status= 'OPEN'" } }).subscribe(val => {
      this.receiving = val['data'];
      this.totaldata = val['count'];
      this.searchrcv = this.receiving;
      refresher.complete();
    });
  }
  doPostRCV(detailrcv) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Posting',
      message: 'Are you sure you want to posting  ' + detailrcv.item_no + ' ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {

          }
        },
        {
          text: 'Posting',
          handler: () => {
            const headers = new HttpHeaders()
              .set("Content-Type", "application/json");

            this.api.put("table/receiving",
              {
                "receiving_no": detailrcv.receiving_no,
                "status": 'CLSD'
              },
              { headers })
              .subscribe(
                (val) => {
                  let alert = this.alertCtrl.create({
                    title: 'Sukses',
                    subTitle: 'Posting Sukses',
                    buttons: ['OK']
                  });
                  this.api.put("table/purchasing_order",
                    {
                      "order_no": this.orderno,
                      "total_item_post": + 1
                    },
                    { headers })
                    .subscribe();
                  alert.present();
                  let uuid = UUID.UUID();
                  this.uuid = uuid;
                  this.api.get("table/receiving", { params: { filter: 'order_no=' + "'" + this.orderno + "'" + ' AND ' + "status= 'OPEN'" } }).subscribe(val => {
                    this.receiving = val['data'];
                    this.totaldata = val['count'];
                    this.searchrcv = this.receiving;
                  });

                },
                response => {

                },
                () => {

                });
          }
        }
      ]
    });
    alert.present();
  }
  doViewRCV(detailrcv) {
    let locationModal = this.modalCtrl.create('ReceivingdetailviewPage',
      {
        detailno: detailrcv.receiving_no,
        docno: detailrcv.doc_no,
        orderno: detailrcv.order_no,
        itemno: detailrcv.item_no,
        qty: detailrcv.qty,
        staging: detailrcv.staging,
        description: detailrcv.receiving_description,
        receivingpic: detailrcv.receiving_pic,
        locationcode: detailrcv.location_code,
        locationplan: detailrcv.position,
        uuid: detailrcv.uuid
      },
      { cssClass: "modal-fullscreen" });
    locationModal.present();
  }
  doUpdateRCV(detailrcv) {
    let locationModal = this.modalCtrl.create('ReceivingdetailupdatePage',
      {
        detailno: detailrcv.receiving_no,
        docno: detailrcv.doc_no,
        orderno: detailrcv.order_no,
        itemno: detailrcv.item_no,
        qty: detailrcv.qty,
        staging: detailrcv.staging,
        description: detailrcv.receiving_description,
        receivingpic: detailrcv.receiving_pic,
        locationcode: detailrcv.location_code,
        locationplan: detailrcv.position,
        uuid: detailrcv.uuid
      },
      { cssClass: "modal-fullscreen" });
    locationModal.present();
  }
  ionViewDidLoad() {
    this.getRCVDetail();
    this.loading = false;
  }
  getNextNo() {
    return this.api.get('nextno/qc_in/qc_no')
  }
  doScanBarcode() {
    var self = this
    Honeywell.barcodeReaderPressSoftwareTrigger(function () {
      Honeywell.onBarcodeEvent(function (data) {
        var barcodeno = data.barcodeData;
        var batchno = barcodeno.substring(0, 4);
        var itemno = barcodeno.substring(4, 20);;
        return new Promise(resolve => {
          self.api.get("table/receiving", {
            params: {
              filter:
                'order_no=' + "'" + self.orderno + "'" +
                " " + 'AND' + " " +
                "batch_no=" + "'" + batchno + "'" +
                " " + 'AND' + " " +
                "item_no=" + "'" + itemno + "'"
            }
          }).subscribe((val) => {
            let data = val['data'];
            for (let i = 0; i < data.length; i++) {
              self.itemdata.push(data[i]);
            }
            if (self.itemdata[0].qty_receiving < self.itemdata[0].qty) {
              let alert = self.alertCtrl.create({
                subTitle: self.itemdata[0].item_no,
                inputs: [
                  {
                    name: 'qty',
                    placeholder: 'Qty',
                    value: '1'
                  }
                ],
                buttons: [
                  {
                    text: 'Cancel',
                    role: 'cancel',
                    handler: data => {

                    }
                  },
                  {
                    text: 'OK',
                    handler: data => {
                      let detailrcv = self.itemdata
                      self.doGetReceiving(detailrcv, data)
                      /*if ((parseInt(self.itemdata[0].qty_receiving) + parseInt(data.qty)) > self.itemdata[0].qty) {
                        let alert = self.alertCtrl.create({
                          title: 'Error',
                          message: 'Total QTY Receiving greater than QTY',
                          buttons: ['OK']
                        });
                        alert.present();
                      }
                      else {
                        const headers = new HttpHeaders()
                          .set("Content-Type", "application/json");
                        self.api.put("table/receiving",
                          {
                            "receiving_no": self.itemdata[0].receiving_no,
                            "qty_receiving": parseInt(self.itemdata[0].qty_receiving) + parseInt(data.qty)
                          },
                          { headers })
                          .subscribe(val => {
                            if ((parseInt(self.itemdata[0].qty_receiving) + parseInt(data.qty)) == self.itemdata[0].qty) {
                              const headers = new HttpHeaders()
                                .set("Content-Type", "application/json");
                              self.api.put("table/receiving",
                                {
                                  "receiving_no": self.itemdata[0].receiving_no,
                                  "status": 'CHECKED'
                                },
                                { headers })
                                .subscribe(val => {
                                  self.getRCV();
                                  self.getRCVChecked();
                                });
                            }
                            self.itemdata = [];
                            self.getRCV();
                            alert.present();
                          });
                      }*/
                    }
                  }
                ]
              });
              alert.present();
              resolve();
            }
            else {
              self.itemdata = [];
              let alert = self.alertCtrl.create({
                title: 'Error',
                message: 'Data Not Found',
                buttons: ['OK']
              });
              alert.present();
            }
          },
            response => {
              let alert = self.alertCtrl.create({
                title: 'Error',
                message: 'Data Not Found' + response,
                buttons: ['OK']
              });
              alert.present();
            })
        });
      }, function (reason) {
        alert(reason + '1');
      });
    }, function (reason) {
      self.barcodeScanner.scan().then(barcodeData => {
        var barcodeno = barcodeData.text;
        var batchno = barcodeno.substring(0, 4);
        var itemno = barcodeno.substring(4, 20);;
        return new Promise(resolve => {
          self.api.get("table/receiving", {
            params: {
              filter:
                'order_no=' + "'" + self.orderno + "'" +
                " " + 'AND' + " " +
                "batch_no=" + "'" + batchno + "'" +
                " " + 'AND' + " " +
                "item_no=" + "'" + itemno + "'"
            }
          }).subscribe((val) => {
            let data = val['data'];
            for (let i = 0; i < data.length; i++) {
              self.itemdata.push(data[i]);
            }
            if (self.itemdata[0].qty_receiving < self.itemdata[0].qty) {
              let alert = self.alertCtrl.create({
                subTitle: self.itemdata[0].item_no,
                inputs: [
                  {
                    name: 'qty',
                    placeholder: 'Qty',
                    value: '1'
                  }
                ],
                buttons: [
                  {
                    text: 'Cancel',
                    role: 'cancel',
                    handler: data => {

                    }
                  },
                  {
                    text: 'OK',
                    handler: data => {
                      if ((parseInt(self.itemdata[0].qty_receiving) + parseInt(data.qty)) > self.itemdata[0].qty) {
                        let alert = self.alertCtrl.create({
                          title: 'Error',
                          message: 'Total QTY Receiving greater than QTY',
                          buttons: ['OK']
                        });
                        alert.present();
                      }
                      else {
                        const headers = new HttpHeaders()
                          .set("Content-Type", "application/json");
                        self.api.put("table/receiving",
                          {
                            "receiving_no": self.itemdata[0].receiving_no,
                            "qty_receiving": parseInt(self.itemdata[0].qty_receiving) + parseInt(data.qty)
                          },
                          { headers })
                          .subscribe(val => {
                            if ((parseInt(self.itemdata[0].qty_receiving) + parseInt(data.qty)) == self.itemdata[0].qty) {
                              const headers = new HttpHeaders()
                                .set("Content-Type", "application/json");
                              self.api.put("table/receiving",
                                {
                                  "receiving_no": self.itemdata[0].receiving_no,
                                  "status": 'CHECKED'
                                },
                                { headers })
                                .subscribe(val => {
                                  self.getRCV();
                                  self.getRCVChecked();
                                });
                            }
                            self.itemdata = [];
                            self.getRCV();
                            alert.present();
                          });
                      }
                    }
                  }
                ]
              });
              alert.present();
              resolve();
            }
            else {
              self.itemdata = [];
              let alert = self.alertCtrl.create({
                title: 'Error',
                message: 'Data Not Found',
                buttons: ['OK']
              });
              alert.present();
            }
          },
            response => {
              let alert = self.alertCtrl.create({
                title: 'Error',
                message: 'Data Not Found' + response,
                buttons: ['OK']
              });
              alert.present();
            })
        });
      }).catch(err => {
        console.log('Error', err);
      });
    }, {
        press: true
      });
  }
  doGetReceiving(detailrcv, data) {
    this.api.get("table/receiving", { params: { filter: 'order_no=' + "'" + detailrcv.order_no + "' AND item_no=" + "'" + detailrcv.item_no + "' AND status= 'OPEN'" } })
      .subscribe(val => {
        let datareceiving = val['data']
        if (datareceiving.length != 0) {
          if ((parseInt(datareceiving[0].qty_receiving) + parseInt(data.qty)) > datareceiving[0].qty) {
            let alert = this.alertCtrl.create({
              title: 'Error',
              message: 'Total QTY Receiving greater than QTY',
              buttons: ['OK']
            });
            alert.present();
            this.getRCV()
          }
          else {
            const headers = new HttpHeaders()
              .set("Content-Type", "application/json");
            this.api.put("table/receiving",
              {
                "receiving_no": datareceiving[0].receiving_no,
                "qty_receiving": parseInt(datareceiving[0].qty_receiving) + parseInt(data.qty)
              },
              { headers })
              .subscribe(val => {
                if ((parseInt(datareceiving[0].qty_receiving) + parseInt(data.qty)) == datareceiving[0].qty) {
                  const headers = new HttpHeaders()
                    .set("Content-Type", "application/json");
                  this.api.put("table/receiving",
                    {
                      "receiving_no": datareceiving[0].receiving_no,
                      "status": 'CHECKED'
                    },
                    { headers })
                    .subscribe(val => {
                      this.getRCV();
                      this.getRCVChecked();
                      this.detailrcv = 'receivingsubmit'
                    });
                }
                this.itemdata = [];
                this.getRCV();
              });
          }
        }
        else {
          let alert = this.alertCtrl.create({
            title: 'Perhatian',
            message: 'Qty sudah di full receive di tempat lain',
            buttons: ['OK']
          });
          alert.present();
          this.viewCtrl.dismiss()
        }
      });
  }
  doReceiving(detailrcv) {
    let alert = this.alertCtrl.create({
      title: detailrcv.item_no,
      inputs: [
        {
          name: 'qty',
          placeholder: 'Qty',
          value: '1'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {

          }
        },
        {
          text: 'OK',
          handler: data => {
            this.doGetReceiving(detailrcv, data)
          }
        }
      ]
    });
    alert.present();
  }
  doOpenStaging(cek) {
    if (cek.staging != '') {
      this.myFormModal.get('location').setValue(cek.staging)
      this.receivingno = cek.receiving_no
      document.getElementById("myModal").style.display = "block";
    }
    else {
      this.myFormModal.reset();
      this.receivingno = cek.receiving_no
      document.getElementById("myModal").style.display = "block";
    }
  }
  doOffStaging() {
    this.myFormModal.reset();
    document.getElementById("myModal").style.display = "none";
  }
  doOpenLocation() {
    this.location_master = [];
    return new Promise(resolve => {
      this.api.get('table/division', { params: { limit: 1000, sort: 'description ASC' } }).subscribe(val => {
        this.division = val['data'];
        this.divisioncode = this.division[14].description
        return new Promise(resolve => {
          this.api.get('table/location_master', { params: { limit: 1000, filter: 'division=' + "'" + this.division[14].code + "' AND location_code=" + "'" + this.rolecab + "'" } }).subscribe(val => {
            this.location_master = val['data'];
            this.searchloc = this.location_master;
            document.getElementById("myLocations").style.display = "block";
            document.getElementById("myHeader").style.display = "none";
            resolve();
          })
        });
      });
    });
  }
  doSetLoc(div) {
    this.setdiv = div.code;
  }
  doLocation() {
    this.api.get('table/location_master', { params: { limit: 1000, filter: 'division=' + "'" + this.setdiv + "' AND location_code=" + "'" + this.rolecab + "'" } }).subscribe(val => {
      this.location_master = val['data'];
      this.searchloc = this.location_master;
    });
  }
  doOffLocations() {
    document.getElementById("myLocations").style.display = "none";
    document.getElementById("myHeader").style.display = "block";
    this.divdesc = '';
  }
  doSelectLoc(locmst) {
    this.myFormModal.get('location').setValue(locmst.location_alocation);
    this.doOffLocations();
  }
  getSearchLoc(ev) {
    // set val to the value of the searchbar
    let val = ev.target.value;

    // if the value is an empty string don't filter the items
    if (val && val.trim() != '') {
      this.location_master = this.searchloc.filter(detailloc => {
        return detailloc.location_alocation.toLowerCase().indexOf(val.toLowerCase()) > -1;
      })
    } else {
      this.location_master = this.searchloc;
    }
  }
  doSaveStaging() {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");

    this.api.put("table/receiving",
      {
        "receiving_no": this.receivingno,
        "staging": this.myFormModal.value.location
      },
      { headers })
      .subscribe(
        (val) => {
          let alert = this.alertCtrl.create({
            title: 'Sukses',
            subTitle: 'Save Sukses',
            buttons: ['OK']
          });
          this.getRCVChecked();
          this.doOffStaging();
        })
  }
  doPostReceiving(cek) {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");
    this.http.post("http://101.255.60.202/posapi/api/poreceive",
      {
        "PONo": cek.order_no
      },
      { headers })
      .subscribe(
        (val) => {
          console.log('Sukses')
        }, err => {
          this.doPostReceiving(cek)
        });
  }
  doGetSubmitReceiving(cek) {
    this.api.get("table/receiving", { params: { filter: 'receiving_no=' + "'" + cek.receiving_no + "' AND status='CHECKED'" } })
      .subscribe(val => {
        let datareceiving = val['data']
        if (datareceiving.length != 0) {
          const headers = new HttpHeaders()
            .set("Content-Type", "application/json");

          this.api.put("table/receiving",
            {
              "receiving_no": cek.receiving_no,
              "status": 'CLSD'
            },
            { headers })
            .subscribe(
              (val) => {
                let alert = this.alertCtrl.create({
                  title: 'Sukses',
                  subTitle: 'Posting Sukses',
                  buttons: ['OK']
                });
                alert.present();
                this.getRCVChecked();
                this.viewCtrl.dismiss()
              },
              response => {

              },
              () => {

              });
          this.api.get('table/purchasing_order', { params: { limit: 30, filter: "order_no=" + "'" + cek.order_no + "'" } })
            .subscribe(val => {
              this.purchasingorder = val['data'];
              if (this.purchasingorder[0].vendor_status == 'FOREIGN') {
                this.api.get('table/staging_in', { params: { limit: 30, filter: "batch_no=" + "'" + cek.batch_no + "' AND item_no=" + "'" + cek.item_no + "' AND staging=" + "'" + cek.staging + "'" } })
                  .subscribe(val => {
                    let data = val['data']
                    if (data.length == 0) {
                      this.doPostStagingInImport(cek)
                    }
                    else {
                      let datatemp = data[0]
                      this.doPutStagingIn(cek, datatemp)
                    }
                  });
              }
              else {
                this.api.get('table/staging_in', { params: { limit: 30, filter: "batch_no=" + "'" + cek.batch_no + "' AND item_no=" + "'" + cek.item_no + "' AND staging=" + "'" + cek.staging + "'" } })
                  .subscribe(val => {
                    let data = val['data']
                    if (data.length == 0) {
                      this.doPostStagingInLocal(cek)
                    }
                    else {
                      let datatemp = data[0]
                      this.doPutStagingIn(cek, datatemp)
                    }
                  });
              }

            });
          this.api.get("table/receiving", { params: { filter: 'order_no=' + "'" + this.orderno + "'" + ' AND ' + "status= 'OPEN'" } }).subscribe(val => {
            let belumreceived = val['data'];
            if (belumreceived.length == 0) {
              const headers = new HttpHeaders()
                .set("Content-Type", "application/json");

              this.api.put("table/purchasing_order",
                {
                  "order_no": this.orderno,
                  "status": 'CLSD'
                },
                { headers })
                .subscribe(val => {
                  this.doPostReceiving(cek)
                });
            }
          });
        }
        else {
          let alert = this.alertCtrl.create({
            title: 'Perhatian',
            subTitle: 'Data sudah di submit ditempat lain',
            buttons: ['OK']
          });
          alert.present();
          this.viewCtrl.dismiss()
        }
      });
  }
  doSubmitRCV(cek) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Submit',
      message: 'Do you want to Submit  ' + cek.item_no + ' ?',
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
            this.doGetSubmitReceiving(cek)
          }
        }
      ]
    });
    alert.present();
  }
  getNextNoRCV() {
    return this.api.get('nextno/receiving/receiving_no')
  }
  doPostPartial(detailrcv) {
    if (detailrcv.qty_receiving == 0) {
      let alert = this.alertCtrl.create({
        title: 'Perhatian',
        subTitle: 'Qty receiving masih kosong',
        buttons: ['OK']
      });
      alert.present();
    }
    else {
      let alert = this.alertCtrl.create({
        title: 'Confirm Posting Partial',
        message: 'Do you want to Submit  ' + detailrcv.item_no + ' ?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {

            }
          },
          {
            text: 'Posting',
            handler: () => {
              if (detailrcv.qty_receiving <= detailrcv.qty) {
                const headers = new HttpHeaders()
                  .set("Content-Type", "application/json");
                this.api.put("table/receiving",
                  {
                    "receiving_no": detailrcv.receiving_no,
                    "status": 'CHECKED'
                  },
                  { headers })
                  .subscribe(val => {
                    this.getNextNoRCV().subscribe(val => {
                      this.nextno = val['nextno'];
                      let uuid = UUID.UUID();
                      this.uuid = uuid;
                      let date = moment().format();
                      const headers = new HttpHeaders()
                        .set("Content-Type", "application/json");
                      this.api.post("table/receiving",
                        {
                          "receiving_no": this.nextno,
                          "order_no": detailrcv.order_no,
                          "batch_no": detailrcv.batch_no,
                          "line_no": detailrcv.line_no,
                          "item_no": detailrcv.item_no,
                          "location_code": detailrcv.location_code,
                          "expected_receipt_date": detailrcv.expected_receipt_date,
                          "description": detailrcv.description,
                          "unit": detailrcv.unit,
                          "qty": parseInt(detailrcv.qty) - parseInt(detailrcv.qty_receiving),
                          "qty_receiving": 0,
                          "vendor_no": detailrcv.vendor_no,
                          "vendor_status": detailrcv.vendor_status,
                          "division": detailrcv.division,
                          "item_category_code": detailrcv.item_category_code,
                          "product_group_code": detailrcv.product_group_code,
                          "location": detailrcv.location,
                          "status": 'OPEN',
                          "status_location": detailrcv.status_location,
                          "status_barcode": 'OK',
                          "pic_location": detailrcv.pic_location,
                          "pic_barcode": detailrcv.pic_barcode,
                          "date": date,
                          "uuid": this.uuid
                        },
                        { headers })
                        .subscribe(val => {
                          this.getRCV();
                          this.getRCVChecked();
                        })
                    });
                    this.getRCV();
                    this.getRCVChecked();
                  });
              }
            }
          }
        ]
      })
      alert.present();
    }
  }
  getNextNoStaging() {
    return this.api.get('nextno/staging_in/staging_no')
  }
  getNextNoStockBalance() {
    return this.api.get('nextno/stock_balance/id')
  }
  getNextNoStock() {
    return this.api.get('nextno/stock/id')
  }
  doPostStockBalance(cek) {
    this.getNextNoStockBalance().subscribe(val => {
      let nextnostockbalance = val['nextno'];
      const headers = new HttpHeaders()
        .set("Content-Type", "application/json");
      let date = moment().format('YYYY-MM-DD HH:mm');
      this.api.post("table/stock_balance",
        {
          "id": nextnostockbalance,
          "receiving_no": cek.receiving_no,
          "batch_no": cek.batch_no,
          "item_no": cek.item_no,
          "qty_in": cek.qty_receiving,
          "qty_out": 0,
          "location": cek.location_code,
          "sub_location": cek.staging,
          "description": 'Receiving',
          "status": 'OPEN',
          "datetime": date,
          "uuid": UUID.UUID()
        },
        { headers })
        .subscribe(val => {
          this.doGetStock(cek)
        }, err => {
          this.doPostStockBalance(cek)
        })
    });
  }
  doGetStock(cek) {
    this.api.get('table/stock', { params: { limit: 30, filter: "batch_no=" + "'" + cek.batch_no + "' AND item_no=" + "'" + cek.item_no + "' AND location=" + "'" + cek.location_code + "' AND sub_location=" + "'" + cek.staging + "'" } })
      .subscribe(val => {
        let data = val['data']
        if (data.length == 0) {
          this.doPostStock(cek)
        }
        else {
          let datastock = data[0]
          this.doPutStock(cek, datastock)
        }
      }, err => {
        this.doGetStock(cek)
      });
  }
  doPostStock(cek) {
    this.getNextNoStock().subscribe(val => {
      let nextnostock = val['nextno'];
      const headers = new HttpHeaders()
        .set("Content-Type", "application/json");
      let date = moment().format('YYYY-MM-DD HH:mm');
      this.api.post("table/stock",
        {
          "id": nextnostock,
          "batch_no": cek.batch_no,
          "item_no": cek.item_no,
          "qty": cek.qty_receiving,
          "location": cek.location_code,
          "sub_location": cek.staging,
          "datetime": date,
          "uuid": UUID.UUID()
        },
        { headers })
        .subscribe(val => {
        }, err => {
          this.doPostStock(cek)
        })
    });
  }
  doPutStock(cek, datastock) {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");
    let date = moment().format('YYYY-MM-DD HH:mm');
    this.api.put("table/stock",
      {
        "id": datastock.id,
        "batch_no": cek.batch_no,
        "item_no": cek.item_no,
        "qty": parseInt(datastock.qty) + parseInt(cek.qty_receiving),
        "location": cek.location_code,
        "sub_location": cek.staging,
        "datetime": date,
        "uuid": UUID.UUID()
      },
      { headers })
      .subscribe(val => {
      }, err => {
        this.doPutStock(cek, datastock)
      })
  }
  doPostStagingInImport(cek) {
    this.getNextNoStaging().subscribe(val => {
      let nextnostaging = val['nextno'];
      const headers = new HttpHeaders()
        .set("Content-Type", "application/json");
      let date = moment().format('YYYY-MM-DD HH:mm');
      this.api.post("table/staging_in",
        {
          "staging_no": nextnostaging,
          "receiving_no": cek.receiving_no,
          "doc_no": cek.doc_no,
          "order_no": cek.order_no,
          "batch_no": cek.batch_no,
          "item_no": cek.item_no,
          "date_entry": date,
          "qty": cek.qty_receiving,
          "qty_qc": cek.qty_receiving,
          "qty_putaway": cek.qty_receiving,
          "unit": cek.unit,
          "staging": cek.staging,
          "uuid": UUID.UUID()
        },
        { headers })
        .subscribe(val => {
          this.doPostStockBalance(cek)
        }, err => {
          this.doPostStagingInImport(cek)
        });
    });
  }
  doPostStagingInLocal(cek) {
    this.getNextNoStaging().subscribe(val => {
      let nextnostaging = val['nextno'];
      const headers = new HttpHeaders()
        .set("Content-Type", "application/json");
      let date = moment().format('YYYY-MM-DD HH:mm');
      this.api.post("table/staging_in",
        {
          "staging_no": nextnostaging,
          "receiving_no": cek.receiving_no,
          "doc_no": cek.doc_no,
          "order_no": cek.order_no,
          "batch_no": cek.batch_no,
          "item_no": cek.item_no,
          "date_entry": date,
          "qty": cek.qty_receiving,
          "qty_qc": cek.qty_receiving,
          "qty_putaway": cek.qty_receiving,
          "unit": cek.unit,
          "staging": cek.staging,
          "uuid": UUID.UUID()
        },
        { headers })
        .subscribe(val => {
          this.doPostStockBalance(cek)
        }, err => {
          this.doPostStagingInLocal(cek)
        });
    });
  }
  doPutStagingIn(cek, datatemp) {
    const headers = new HttpHeaders()
      .set("Content-Type", "application/json");
    let date = moment().format('YYYY-MM-DD HH:mm');
    this.api.put("table/staging_in",
      {
        "staging_no": datatemp.staging_no,
        "receiving_no": cek.receiving_no,
        "doc_no": cek.doc_no,
        "order_no": cek.order_no,
        "batch_no": cek.batch_no,
        "item_no": cek.item_no,
        "date_entry": date,
        "qty": parseInt(datatemp.qty) + parseInt(cek.qty_receiving),
        "qty_qc": parseInt(datatemp.qty) + parseInt(cek.qty_receiving),
        "qty_putaway": parseInt(datatemp.qty) + parseInt(cek.qty_receiving),
        "unit": cek.unit,
        "staging": cek.staging
      },
      { headers })
      .subscribe(val => {
        this.doPostStockBalance(cek)
      }, err => {
        this.doPutStagingIn(cek, datatemp)
      });
  }
}