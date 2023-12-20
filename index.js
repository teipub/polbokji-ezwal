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

(async () => {
    const browser = await makeBrowser()

    // 로그인
    await browser.url(site.url)
    await browser.$('#loginSearchBean_userId').waitForExist()
    await browser.$('#loginSearchBean_userId').setValue(config.id)
    await browser.$('#loginSearchBean_password1').setValue(config.password)
    await browser.$('.lgn_ip_lgn').click()
    await waitForTitle(browser, 'cuser/main.ez')

    // 예약 페이지로 이동
    await browser.url(site.reservation)
    await waitForTitle(browser, 'checkinTrainingCenterBookable.ez')

    while(true) {
        await search(browser)
        await browser.pause(config.waitMilliseconds)
    }

    //
    //
    // for (const idx in scripts) {
    //     console.log(scripts[idx])
    // }
    //
    // if (0 < scripts.length) {
    //     await browser.execute(script[0])
    //     await waitForTitle(browser, 'checkinTrainingCenterStepTwo.ez')
    //
    //     await browser.$(`#cal${config.date}`).click()
    //     const roomElements = await browser.$$('select#roomCd>option')
    //
    //     for (const idx in roomElements) {
    //         const roomElement = roomElements[idx]
    //         const roomText = await roomElement.getText()
    //
    //         if (0 < roomText.indexOf(config.roomName)) {
    //             await roomElement.click()
    //             break
    //         }
    //     }
    //
    //     await browser.$$('select#dayDiff>option')[1].click()
    //     await browser.$$('select#useManCnt>option')[2].click()
    //     await browser.$$('select#useChildCnt>option')[2].click()
    // }
    //
})().catch((e) => console.error(e))

const waitForTitle = async (browser, title) => {
    await browser.waitUntil(async function () {
        return -1 < (await browser.getUrl()).indexOf(title)
    }, {
        timeout: 10000,
        timeoutMsg: 'expected text to be different after 10s'
    })
}


const search = async (browser) => {
    await browser.execute(`goCal('${config.date.substring(0, 6)}01');`)
    await waitForTitle(browser, 'checkinTrainingCenterBookable.ez')

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

        for (const idx2 in config.preferredRooms) {
            const preferredRoom = config.preferredRooms[idx2]

            if (0 < script.indexOf(preferredRoom)) {
                try {
                    await reserve(browser, script)
                } catch(e) {
                    console.error(e)
                }
            }
        }
    }
}

const reserve = async (browser, script) => {
    await browser.execute(script)
    await waitForTitle(browser, 'checkinTrainingCenterStepTwo.ez')

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
    await browser.$$('select#useManCnt>option')[2].click()
    await browser.$$('select#useChildCnt>option')[2].click()
}
