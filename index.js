import {remote} from 'webdriverio'
import fs from 'fs'

const site = JSON.parse(fs.readFileSync('./site.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const makeBrowser = async () => {
    return await remote({
        logLevel: 'error',
        path: '/', // remove `path` if you decided using something different from driver binaries.
        capabilities: {
            browserName: 'chrome'
        }
    })
}

let browser

(async () => {
     browser = await makeBrowser()

    // 로그인
    await browser.url(site.url)
    await browser.$('#loginSearchBean_userId').waitForExist()
    await browser.$('#loginSearchBean_userId').setValue(config.id)
    await browser.$('#loginSearchBean_password1').setValue(config.password)
    await browser.$('.lgn_ip_lgn').click()
    await waitForTitle('cuser/main.ez')

    await browser.url('https://polbokji.ezwel.com/cuser/checkin/info/checkinInfoPolForm.ez')
    await waitForTitle('checkinInfoPolForm.ez')
    await goToBookablePage()
    // await browser.url(site.reservation)
    // await waitForTitle('checkinTrainingCenterBookable.ez')

    while(true) {
        await search()
        await browser.pause(config.waitMilliseconds)
    }
})().catch((e) => console.error(e))

const waitForTitle = async (title) => {
    await browser.waitUntil(async function () {
        return -1 < (await browser.getUrl()).indexOf(title)
    }, {
        timeout: 10000,
        timeoutMsg: 'expected text to be different after 10s'
    })
}


// 예약 페이지로 이동
const goToBookablePage = async () => {
    const menu = await browser.$$('ul.lnb_menu>li>a')
    const url = await menu[2].getAttribute('onclick')
    await browser.execute(url)
    await waitForTitle('checkinTrainingCenterBookable.ez')
}


const search = async () => {
    await browser.execute(`goCal('${config.date.substring(0, 6)}01');`)
    await waitForTitle('checkinTrainingCenterBookable.ez')

    const elements = await browser.$$('a.btn.btn_primary.btn_rgl')
    const allScripts = []

    for (const idx in elements) {
        const el = elements[idx]

        if (el.getAttribute) {
            const script = await el.getAttribute('onclick')

            allScripts.push(script)
        }
    }

    const scripts = allScripts.filter((s) => 0 < s.indexOf(config.date))

    for (const idx in scripts) {
        const script = scripts[idx]

        for (const idx2 in config.preferredAccommodations) {
            const preferredRoom = config.preferredAccommodations[idx2]

            if (0 < script.indexOf(preferredRoom)) {
                try {
                    await reserve(script)
                } catch(e) {
                    console.error(e)
                }
            }
        }
    }
}

const reserve = async (script) => {
    console.log('reserve')
    await browser.execute(script)
    await waitForTitle('checkinTrainingCenterStepTwo.ez')

    const rooms = await getRooms()
    const selectedRoom = rooms.filter((r) => {
        return -1 < r.name.indexOf(config.roomName)
    })

    if (selectedRoom[0].count === 0) {
        console.log('reserve failed: no room')
        await goToBookablePage()
        return
    }

    await browser.$(`#cal${config.date}`).click()
    const roomElements = await browser.$$('select#roomCd>option')

    for (const idx in roomElements) {
        const roomElement = roomElements[idx]
        const roomText = await roomElement.getText()

        if (0 < roomText.indexOf(config.roomName)) {
            await roomElement.click()
            break
        }
    }

    await browser.$('select#dayDiff').waitForEnabled()
    await browser.$$('select#dayDiff>option')[1].click()

    // 인원이 없을때
    await browser.pause(1000)
    const isAlertOpen = await browser.isAlertOpen()

    if(isAlertOpen) {
        console.log('reserve failed: alert open')
        await browser.dismissAlert()
        await goToBookablePage()
        return
    }

    await browser.$$('select#useManCnt>option')[2].click()
    await browser.$$('select#useChildCnt>option')[2].click()
}


const getRooms = async () => {
    const table = await browser.$('table.tbl_calendar');
    await table.waitForExist({ timeout: 5000 });

    const roomElements = await browser.$$('#cal20240116 div.box_preview_room')
    const rooms = []

    for (const idx in roomElements) {
        const roomElement = roomElements[idx]

        if(!roomElement.getText) {
            continue
        }

        const name = (await roomElement.getText()).split(':')[0].trim()
        const count = await browser.$(roomElement).$('span').getText()

        rooms.push({"name": name, "count": parseInt(count)})
    }

    return rooms
}
