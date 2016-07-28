// TEMP
export default null

import {HTML, on, makeEl, table, inputValue} from '../util'
import {$threads} from '../page/common'
import View from '../view'
import Model from '../model'
import {write, read} from '../render'
import {FormView, inputType, renderInput, InputSpec} from '../forms'
import {Captcha} from '../captcha'
import identity from './identity'
import {page} from '../state'
import {posts as lang, ui} from '../lang'
import {send, message, handlers} from '../connection'

interface ThreadCreationRequest extends Captcha {
	name?: string
	email?: string
	auth?: string // TODO
	password: string
	subject?: string
	board: string
	body: string
}

// Maximum lengths of various post fields
export const maxLengths: {[key: string]: number} = {
	subject: 50,
	body: 2000,
}

// Response codes for thread and post insertion requests
export const enum responseCode {success, invalidCaptcha}

// For ensuring we have unique captcha IDs
let threadFormCounter = 0

on($threads, "click", e => new ThreadForm(e), {selector: ".new-thread-button"})

// Form view for creating new threads
class ThreadForm extends FormView {
	$aside: Element

	constructor(event: Event) {
		super({class: "new-thread-form"}, () =>
			this.sendRequest())
		this.$aside = (event.target as Element).closest("aside")
		this.render()
		handlers[message.insertThread] = (code: responseCode) =>
			this.handleResponse(code)
	}

	// Render the element, hide the parent element's existing contents and
	// hide the "["..."]" encasing it
	render() {
		const specs: InputSpec[] = [
			{
				name: "subject",
				type: inputType.string,
				maxLength: maxLengths["subject"],
			},
			{
				name: "body",
				type: inputType.multiline,
				rows: 4,
				maxLength: maxLengths["body"],
			},
		]

		// Have the user to select the target board, if on the "/all/" metaboard
		if (page.board === "all") {
			// TODO: Some kind of selection panel
			specs.unshift({
				name: "board",
				type: inputType.string,
				maxLength: 3,
			})
		}

		let html = ""
		for (let spec of specs) {
			spec.label = lang[spec.name]
			spec.placeholders = true
			html += renderInput(spec)[1] + "<br>"
		}
		this.renderForm(html)
		write(() => {
			const cls = this.$aside.classList
			cls.remove("act")
			cls.add("expanded")
			this.$aside.append(this.el)
		})
	}

	remove() {
		super.remove()
		write(() => {
			const cls = this.$aside.classList
			cls.remove("expanded")
			cls.add("act")
		})
	}

	sendRequest() {
		const req: any = {
			password: identity.postPassword,
		}
		for (let key of ["name", "email"]) {
			const val = identity[key]
			if (val) {
				req[key] = val
			}
		}
		const subject = inputValue(this.el, "subject")
		if (subject) {
			req.subject = subject
		}
		req.body = this.el.querySelector("textarea[name=body]").value
		if (page.board === "all") {
			req["board"] = inputValue(this.el, "board")
		}
		this.injectCaptcha(req)
		send(message.insertThread, req)
	}

	handleResponse(code: responseCode) {
		switch (code) {
		case responseCode.success:
			this.remove()

			// TODO: Redirect to newly-created thread

			break
		case responseCode.invalidCaptcha:
			this.renderFormResponse(ui.invalidCaptcha)
			this.reloadCaptcha(code)
			break
		}
	}
}